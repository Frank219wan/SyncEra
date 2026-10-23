"""Synthetic integration tests on the single reviewed Neon Preview target."""
import os
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
import fitz
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
    from scripts.preview_test_db import checked_test_url
    safe_url = checked_test_url(URL)
    monkeypatch.setenv('DATABASE_URL', safe_url)
    monkeypatch.setenv('PROFILE_STORE', 'postgres')
    store_a = PostgresProfileStore(safe_url)
    store_b = PostgresProfileStore(safe_url)
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
        from scripts.migrate_postgres import verified_preview_connection
        with verified_preview_connection(URL) as (db, _server_ssl):
            db.execute('DELETE FROM public.profiles WHERE profile_id=%s', (profile_id,))
        store_a.close()
        store_b.close()


@pytest.mark.skipif(not URL, reason='TEST_DATABASE_URL is not configured')
def test_synthetic_cv_psychology_confirm_postgres_readback(monkeypatch):
    import json
    from scripts.preview_test_db import checked_test_url

    safe_url = checked_test_url(URL)
    monkeypatch.setenv('DATABASE_URL', safe_url)
    monkeypatch.setenv('PROFILE_STORE', 'postgres')
    store_a = PostgresProfileStore(safe_url)
    store_b = PostgresProfileStore(safe_url)
    adapter = create_adapter()  # Rule adapter: no paid MiniMax call.
    original_extract = adapter.extract_profile
    extracts = []
    def counted_extract(text, form):
        extracts.append(1)
        return original_extract(text, form)
    adapter.extract_profile = counted_extract
    first = TestClient(create_app(store=store_a, adapter=adapter))
    second = TestClient(create_app(store=store_b, adapter=create_adapter()))
    marker = 'Synthetic psychology ' + uuid4().hex
    pdf = fitz.open()
    page = pdf.new_page()
    page.insert_text((72, 72), marker + '. SQL analytics.')
    content = pdf.tobytes()
    pdf.close()
    profile_id = None
    try:
        uploaded = first.post('/api/v1/profiles/upload',
            data={'synthetic_input':'true','study_constraints':json.dumps(CONSTRAINTS)},
            files={'file':('fictional.pdf', content, 'application/pdf')})
        assert uploaded.status_code == 200, uploaded.text
        draft = uploaded.json()['data']['profile']
        profile_id = draft['profile_id']
        assert draft['revision'] == 1 and len(extracts) == 1
        answers = {'assessment_version':'1.0','assessment_type':'self_report_reflection',
                   'scenario_answers':{'S1':'A','S2':None,'S3':'E','S4':'C','S5':None},
                   'other_responses':{'S3':'Fictional answer'},'consent_to_personalization':True}
        body = {'profile_id':profile_id,'profile_revision':1,'reviewed_by_user':True,
                'skills':[{'skill_id':'skill_sql','level':3,'source':'confirmed','confidence':1}],
                'psychology':answers}
        confirmed = first.post('/api/v1/profiles/confirm',json=body)
        assert confirmed.status_code == 200, confirmed.text
        readback = second.get(f'/api/v1/profiles/{profile_id}')
        assert readback.status_code == 200
        saved = readback.json()['data']['profile']
        assert saved['revision'] == 2 and saved['psychology']['scenario_answers'] == answers['scenario_answers']
        assert saved['psychology']['other_responses'] == answers['other_responses']
        assert saved['interests'] == draft['interests']
        assert saved['current_occupation'] == draft['current_occupation']
        assert saved['skills'][0]['skill_id'] == 'skill_sql'
        assert len(extracts) == 1
        rec = second.post('/api/v1/recommendations',json={'profile_id':profile_id,'ai_scenario':'moderate'})
        assert rec.status_code == 200 and rec.json()['data']['recommendations']
        role = next(item for item in rec.json()['data']['recommendations'] if item['skill_gaps'])
        skill_id = role['skill_gaps'][0]['skill_id']
        assert second.post('/api/v1/learning/skill-map',json={'profile_id':profile_id,
            'role_id':role['role_id'],'skill_id':skill_id,'language':'en',
            'budget_amount':0,'currency':'MYR'}).status_code == 200
        assert second.post('/api/v1/learning/roadmap',json={'profile_id':profile_id,
            'role_id':role['role_id'],'selected_skill_ids':[skill_id],
            'study_constraints':CONSTRAINTS}).status_code == 200
        stale = second.post('/api/v1/profiles/confirm',json=body)
        assert stale.status_code == 409 and stale.json()['error']['code'] == 'SNAPSHOT_CONFLICT'
        assert store_a.get(profile_id).revision == 2
        assert len(extracts) == 1
    finally:
        if profile_id:
            from scripts.migrate_postgres import verified_preview_connection
            with verified_preview_connection(URL) as (db, _server_ssl):
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
