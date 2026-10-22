"""Run against a disposable PostgreSQL database via TEST_DATABASE_URL."""
import os
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.storage import ProfileStore, PostgresProfileStore, create_profile_store
from app.cv_upload import upload_limit
from futureproof_ai.futureproof_adapter import create_adapter


URL = os.getenv('TEST_DATABASE_URL')
CONSTRAINTS = {'weekly_hours': 5, 'budget_amount': 0, 'currency': 'MYR',
               'language': 'en', 'target_weeks': 12, 'learning_pace': 'focused'}


@pytest.mark.skipif(not URL, reason='TEST_DATABASE_URL is not configured')
def test_persistent_http_flow_and_atomic_revision(monkeypatch):
    import psycopg
    from scripts.migrate_postgres import main as migrate
    monkeypatch.setenv('DATABASE_URL', URL)
    monkeypatch.setenv('PROFILE_STORE', 'postgres')
    migrate()
    migrate()  # Idempotent initialization.
    store_a = PostgresProfileStore(URL)
    store_b = PostgresProfileStore(URL)
    first = TestClient(create_app(store=store_a, adapter=create_adapter()))
    second = TestClient(create_app(store=store_b, adapter=create_adapter()))
    marker = 'Synthetic ' + uuid4().hex
    # Mimic an idle pooled connection being closed by a network/proxy hop.
    # The next checkout must discard it before Normalize writes a profile.
    stale = store_a.pool.getconn()
    store_a.pool.putconn(stale)
    stale.close()
    response = first.post('/api/v1/profiles/normalize', json={
        'pipeline': 'A', 'input_type': 'form', 'synthetic_input': True,
        'form': {'current_occupation': marker, 'skills': [{'skill_id': 'skill_sql', 'level': 3}]},
        'study_constraints': CONSTRAINTS,
    })
    assert response.status_code == 200, response.text
    profile = response.json()['data']['profile']
    profile_id = profile['profile_id']
    try:
        assert second.get(f'/api/v1/profiles/{profile_id}').json()['data']['profile']['current_occupation'] == marker
        unconfirmed = second.post('/api/v1/recommendations', json={
            'profile_id': profile_id, 'region': 'MY', 'ai_scenario': 'moderate'})
        assert unconfirmed.status_code == 422
        body = {'profile_id': profile_id, 'skills': profile['skills'],
                'reviewed_by_user': True, 'profile_revision': profile['revision']}
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda client: client.post('/api/v1/profiles/confirm', json=body),
                                        [first, second]))
        assert sorted(result.status_code for result in results) == [200, 409]
        assert second.get(f'/api/v1/profiles/{profile_id}').json()['data']['profile_revision'] == 2
        for scenario in ('moderate', 'fast'):
            result = second.post('/api/v1/recommendations', json={
                'profile_id': profile_id, 'region': 'MY', 'ai_scenario': scenario})
            assert result.status_code == 200, result.text
            assert result.json()['data']['recommendations']
    finally:
        with psycopg.connect(URL) as db:
            db.execute('DELETE FROM public.profiles WHERE profile_id=%s', (profile_id,))
        store_a.close()
        store_b.close()


def test_vercel_cannot_fall_back_to_sqlite(monkeypatch, tmp_path):
    monkeypatch.setenv('VERCEL', '1')
    monkeypatch.setenv('PROFILE_STORE', 'postgres')
    monkeypatch.delenv('DATABASE_URL', raising=False)
    monkeypatch.setenv('DATABASE_PATH', str(tmp_path / 'should-not-exist.sqlite'))
    with pytest.raises(RuntimeError, match='DATABASE_URL'):
        create_profile_store()
    assert not (tmp_path / 'should-not-exist.sqlite').exists()


def test_preview_requires_explicit_postgres_selection(monkeypatch, tmp_path):
    monkeypatch.setenv('VERCEL_ENV', 'preview')
    monkeypatch.delenv('PROFILE_STORE', raising=False)
    monkeypatch.setenv('DATABASE_PATH', str(tmp_path / 'should-not-exist.sqlite'))
    with pytest.raises(RuntimeError, match='PROFILE_STORE=postgres'):
        create_profile_store()
    assert not (tmp_path / 'should-not-exist.sqlite').exists()


def test_postgres_connection_failure_cannot_fall_back(monkeypatch, tmp_path):
    monkeypatch.setenv('PROFILE_STORE', 'postgres')
    monkeypatch.setenv('DATABASE_URL', 'postgresql://invalid.invalid/test')
    monkeypatch.setenv('DATABASE_PATH', str(tmp_path / 'should-not-exist.sqlite'))
    def fail_connection(_url):
        raise RuntimeError('PostgreSQL connection or profiles schema is unavailable')
    monkeypatch.setattr('app.storage.PostgresProfileStore', fail_connection)
    with pytest.raises(RuntimeError, match='PostgreSQL connection'):
        create_profile_store()
    assert not (tmp_path / 'should-not-exist.sqlite').exists()


def test_existing_production_store_selection_is_unchanged(monkeypatch, tmp_path):
    monkeypatch.setenv('VERCEL', '1')
    monkeypatch.delenv('PROFILE_STORE', raising=False)
    monkeypatch.delenv('DATABASE_URL', raising=False)
    monkeypatch.setenv('DATABASE_PATH', str(tmp_path / 'production.sqlite'))
    assert isinstance(create_profile_store(), ProfileStore)


def test_vercel_upload_is_disabled_and_capped(monkeypatch, tmp_path):
    monkeypatch.setenv('VERCEL', '1')
    monkeypatch.delenv('DATABASE_URL', raising=False)
    monkeypatch.setenv('FRONTEND_ORIGINS', 'https://example.vercel.app')
    monkeypatch.setenv('MAX_CV_UPLOAD_BYTES', str(10 * 1024 * 1024))
    assert upload_limit() == 3 * 1024 * 1024
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / 'local.sqlite'))))
    response = client.post('/api/v1/profiles/upload', files={'file': ('demo.pdf', b'%PDF-test', 'application/pdf')},
                           data={'synthetic_input': 'true', 'study_constraints': '{}'})
    assert response.status_code == 503
    assert response.json()['error']['code'] == 'UPLOAD_DISABLED'


def test_tokenhub_cannot_start_in_vercel_production(monkeypatch, tmp_path):
    monkeypatch.setenv('VERCEL', '1')
    monkeypatch.setenv('VERCEL_ENV', 'production')
    monkeypatch.setenv('AI_ADAPTER_MODULE', 'futureproof_ai.tencent_tokenhub_adapter')
    with pytest.raises(RuntimeError, match='only for Vercel Preview'):
        create_app(store=ProfileStore(str(tmp_path / 'local.sqlite')))


def test_profile_readback_is_not_exposed_in_vercel_production(monkeypatch, tmp_path):
    monkeypatch.setenv('VERCEL', '1')
    monkeypatch.setenv('VERCEL_ENV', 'production')
    monkeypatch.delenv('AI_ADAPTER_MODULE', raising=False)
    monkeypatch.setenv('FRONTEND_ORIGINS', 'https://example.vercel.app')
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / 'local.sqlite'))))
    assert client.get('/api/v1/profiles/profile_synthetic').status_code == 404


def test_profile_readback_needs_explicit_preview_opt_in(monkeypatch, tmp_path):
    monkeypatch.setenv('VERCEL', '1')
    monkeypatch.setenv('VERCEL_ENV', 'preview')
    monkeypatch.delenv('ENABLE_PROFILE_READBACK', raising=False)
    monkeypatch.setenv('FRONTEND_ORIGINS', 'https://example.vercel.app')
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / 'local.sqlite'))))
    assert client.get('/api/v1/profiles/profile_synthetic').status_code == 404


def test_vercel_requires_exact_https_frontend_origins(monkeypatch, tmp_path):
    monkeypatch.setenv('VERCEL', '1')
    monkeypatch.delenv('AI_ADAPTER_MODULE', raising=False)
    monkeypatch.setenv('FRONTEND_ORIGINS', 'http://example.vercel.app')
    with pytest.raises(RuntimeError, match='exact HTTPS origins'):
        create_app(store=ProfileStore(str(tmp_path / 'local.sqlite')))
