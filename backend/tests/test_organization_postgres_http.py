"""Synthetic B1/B2 HTTP and cross-process persistence on the reviewed Preview."""

import json
import os
import subprocess
import sys

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.organization_storage import PostgresOrganizationRepository
from app.storage import PostgresProfileStore
from futureproof_ai.futureproof_adapter import create_adapter
from scripts.preview_test_db import checked_test_url
from scripts.migrate_postgres import verified_preview_connection
from test_organization import hr_request_body, request_body


pytestmark = pytest.mark.skipif(
    not os.getenv('TEST_DATABASE_URL'),
    reason='TEST_DATABASE_URL is required for reviewed Preview PostgreSQL tests',
)


def _new_process_readback(workspace_id: str) -> dict:
    # The child obtains and checks the target independently. No URL appears in
    # command arguments or captured output, and no payload body is printed.
    code = """
import json, os, psycopg
from scripts.preview_test_db import checked_test_url
url = checked_test_url(os.environ['TEST_DATABASE_URL'])
with psycopg.connect(url) as db:
    row = db.execute('SELECT mode, revision FROM public.organization_workspaces WHERE workspace_id=%s',
                     (os.environ['SYNTHETIC_WORKSPACE_ID'],)).fetchone()
    count = db.execute('SELECT count(*) FROM public.organization_analyses WHERE workspace_id=%s',
                       (os.environ['SYNTHETIC_WORKSPACE_ID'],)).fetchone()[0]
print(json.dumps({'mode': row[0], 'revision': row[1], 'analyses': count}))
"""
    env = dict(os.environ, SYNTHETIC_WORKSPACE_ID=workspace_id)
    result = subprocess.run([sys.executable, '-c', code], env=env,
                            capture_output=True, text=True, timeout=20, check=False)
    assert result.returncode == 0, 'Independent Preview readback failed'
    return json.loads(result.stdout)


def test_b1_b2_http_revision_and_cross_process_readback(monkeypatch):
    safe_url = checked_test_url(os.environ['TEST_DATABASE_URL'])
    monkeypatch.setenv('DATABASE_URL', safe_url)
    monkeypatch.setenv('PROFILE_STORE', 'postgres')
    stores = [PostgresProfileStore(safe_url), PostgresProfileStore(safe_url)]
    clients = [TestClient(create_app(
        store=store, adapter=create_adapter(),
        organization_store=PostgresOrganizationRepository(store.pool),
    )) for store in stores]
    created_ids = []
    try:
        for mode, body in [('hr', hr_request_body()), ('career_centre', request_body())]:
            path = f'/api/v1/organizations/{mode}/analyze'
            first = clients[0].post(path, json=body)
            assert first.status_code == 200
            data = first.json()['data']
            workspace_id = data['workspace_id']
            created_ids.append(workspace_id)
            assert data['workspace_revision'] == 1
            assert data['mode'] == mode

            update = body.copy()
            update['workspace_id'] = workspace_id
            update['workspace_revision'] = 1
            second = clients[1].post(path, json=update)
            assert second.status_code == 200
            assert second.json()['data']['workspace_revision'] == 2

            stale = clients[0].post(path, json=update)
            assert stale.status_code == 409
            assert stale.json()['error']['code'] == 'REVISION_CONFLICT'

            assert _new_process_readback(workspace_id) == {
                'mode': mode, 'revision': 2, 'analyses': 2,
            }

            other_mode = 'career_centre' if mode == 'hr' else 'hr'
            other_body = request_body() if other_mode == 'career_centre' else hr_request_body()
            other_body['workspace_id'] = workspace_id
            other_body['workspace_revision'] = 2
            cross_mode = clients[1].post(
                f'/api/v1/organizations/{other_mode}/analyze', json=other_body)
            assert cross_mode.status_code == 409
            assert cross_mode.json()['error']['code'] == 'REVISION_CONFLICT'
            assert _new_process_readback(workspace_id) == {
                'mode': mode, 'revision': 2, 'analyses': 2,
            }
    finally:
        for store in stores:
            store.close()
        if created_ids:
            with verified_preview_connection(os.environ['TEST_DATABASE_URL']) as (db, _server_ssl):
                for workspace_id in created_ids:
                    db.execute('DELETE FROM public.organization_analyses WHERE workspace_id=%s',
                               (workspace_id,))
                    db.execute('DELETE FROM public.organization_workspaces WHERE workspace_id=%s',
                               (workspace_id,))
