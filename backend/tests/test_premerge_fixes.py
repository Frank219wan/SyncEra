import asyncio
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from app import services
from app.ai_adapter import DemoAdapter
from app.approved_data import MarketRepository
from app.main import create_app
from app.models import ConfirmRequest, ScoreBreakdown
from app.storage import ProfileStore
from app.upload_guard import UploadBodyLimitMiddleware, MAX_MULTIPART_OVERHEAD_BYTES
from app.cv_upload import MAX_FILE_BYTES


CONSTRAINTS = {'weekly_hours': 5, 'budget_amount': 0, 'currency': 'MYR',
               'language': 'en', 'target_weeks': 8, 'learning_pace': 'focused'}


def new_profile(client):
    response = client.post('/api/v1/profiles/normalize', json={
        'pipeline': 'A', 'input_type': 'guided_text', 'synthetic_input': True,
        'text': 'Synthetic career profile', 'study_constraints': CONSTRAINTS,
    })
    assert response.status_code == 200
    return response.json()['data']['profile']


def confirm(client, profile_id, skills=None, revision=None):
    payload = {'profile_id': profile_id, 'skills': skills or [], 'reviewed_by_user': True}
    if revision is not None:
        payload['profile_revision'] = revision
    return client.post('/api/v1/profiles/confirm', json=payload)


class TamperAdapter(DemoAdapter):
    scoring_policy = 'demo-v1'
    is_mock = False

    def __init__(self, market, change):
        self.market = market
        self.change = change

    def score_roles(self, profile, trend_package, scenario):
        rows = services.demo_recommendations(
            profile, self.market.get_snapshot(trend_package.snapshot_id), scenario,
            profile.preferred_field_id, 20,
        )
        self.change(rows[0])
        return rows


def _zero_skill_100(row):
    row['score_breakdown'] = dict.fromkeys(row['score_breakdown'], 100)
    row['match_score'] = 100
    row['skill_gaps'] = []


def _missing_gaps(row):
    row['skill_gaps'] = []


def _wrong_current(row):
    row['skill_gaps'][0]['current_level'] = 5


def _wrong_target(row):
    row['skill_gaps'][0]['target_level'] = 1


def _false_strength(row):
    row['strengths'] = [row['skill_gaps'][0]['skill_id']]


def _wrong_outlook(row):
    row['score_breakdown']['scenario_outlook'] += 1
    row['match_score'] = ScoreBreakdown.model_validate(row['score_breakdown']).total()


def _wrong_evidence(row):
    row['evidence_ids'] = ['ev_nonexistent']


def _wrong_assumption(row):
    row['scenario_assumptions'] = ['observed metrics doubled']


@pytest.mark.parametrize('change', [
    _zero_skill_100, _missing_gaps, _wrong_current, _wrong_target,
    _false_strength, _wrong_outlook, _wrong_evidence, _wrong_assumption,
], ids=['zero-skill-100', 'missing-gaps', 'wrong-current', 'wrong-target',
         'false-strength', 'wrong-outlook', 'invalid-evidence', 'wrong-assumption'])
def test_adapter_cannot_publish_untrusted_recommendation(tmp_path, change):
    market = MarketRepository()
    store = ProfileStore(str(tmp_path / 'profiles.sqlite'))
    client = TestClient(create_app(store=store, market=market, adapter=TamperAdapter(market, change)))
    profile = new_profile(client)
    assert confirm(client, profile['profile_id']).status_code == 200
    response = client.post('/api/v1/recommendations', json={
        'profile_id': profile['profile_id'], 'ai_scenario': 'moderate',
    })
    assert response.status_code == 502
    assert response.json()['error']['code'] == 'MODEL_INVALID_OUTPUT'
    assert 'trusted' not in response.text.lower()


def test_unchanged_demo_policy_still_accepts_valid_output(tmp_path):
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / 'profiles.sqlite'))))
    profile = new_profile(client)
    assert confirm(client, profile['profile_id']).status_code == 200
    response = client.post('/api/v1/recommendations', json={
        'profile_id': profile['profile_id'], 'ai_scenario': 'moderate',
    })
    assert response.status_code == 200
    assert response.json()['data']['recommendations']


def test_revision_required_after_first_confirmation(tmp_path):
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / 'profiles.sqlite'))))
    profile = new_profile(client)
    first = confirm(client, profile['profile_id'])
    assert first.status_code == 200 and first.json()['data']['profile_revision'] == 2
    missing = confirm(client, profile['profile_id'])
    assert missing.status_code == 409
    assert missing.json()['error']['code'] == 'PROFILE_REVISION_REQUIRED'
    stale = confirm(client, profile['profile_id'], revision=1)
    assert stale.status_code == 409 and stale.json()['error']['code'] == 'SNAPSHOT_CONFLICT'
    current = confirm(client, profile['profile_id'], revision=2)
    assert current.status_code == 200 and current.json()['data']['profile_revision'] == 3


def test_concurrent_confirms_only_one_wins(tmp_path):
    store = ProfileStore(str(tmp_path / 'profiles.sqlite'))
    client = TestClient(create_app(store=store))
    profile = new_profile(client)
    assert confirm(client, profile['profile_id']).status_code == 200
    request = ConfirmRequest(profile_id=profile['profile_id'], skills=[],
                             reviewed_by_user=True, profile_revision=2)

    def update():
        try:
            return services.confirm(store, request)['profile_revision']
        except services.APIError as exc:
            return exc.status

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(lambda _: update(), range(2)))
    assert sorted(outcomes) == [3, 409]


async def run_guard(headers, chunks, path='/api/v1/profiles/upload'):
    reads = 0
    sent = []
    messages = [{'type': 'http.request', 'body': chunk, 'more_body': i < len(chunks) - 1}
                for i, chunk in enumerate(chunks)]

    async def receive():
        nonlocal reads
        reads += 1
        return messages.pop(0)

    async def send(message):
        sent.append(message)

    async def inner(scope, receive, send):
        while True:
            message = await receive()
            if not message.get('more_body', False):
                break
        await send({'type': 'http.response.start', 'status': 200, 'headers': []})
        await send({'type': 'http.response.body', 'body': b''})

    scope = {'type': 'http', 'method': 'POST', 'path': path, 'headers': headers, 'state': {}}
    await UploadBodyLimitMiddleware(inner)(scope, receive, send)
    return sent[0]['status'], reads


def test_upload_declared_oversize_is_rejected_before_reading_body():
    total = MAX_FILE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES
    status, reads = asyncio.run(run_guard([(b'content-length', str(total + 1).encode())], [b'x']))
    assert (status, reads) == (413, 0)


@pytest.mark.parametrize('headers', [[], [(b'content-length', b'1')]])
def test_upload_stream_is_counted_without_trusting_length(headers):
    total = MAX_FILE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES
    status, reads = asyncio.run(run_guard(headers, [b'a' * total, b'b']))
    assert (status, reads) == (413, 2)


def test_upload_malformed_length_and_other_routes():
    assert asyncio.run(run_guard([(b'content-length', b'nonsense')], [b'x'])) == (400, 0)
    assert asyncio.run(run_guard([], [b'x' * (MAX_FILE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES + 1)],
                                 path='/api/v1/profiles/normalize')) == (200, 1)


def test_real_upload_route_rejects_oversize_multipart_before_parser(tmp_path, monkeypatch):
    monkeypatch.setenv('MAX_CV_UPLOAD_BYTES', '128')
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / 'profiles.sqlite'))))
    response = client.post('/api/v1/profiles/upload',
                           files={'file': ('synthetic.pdf', b'x' * (MAX_MULTIPART_OVERHEAD_BYTES + 1024), 'application/pdf')},
                           data={'synthetic_input': 'true', 'study_constraints': '{}'})
    assert response.status_code == 413
    assert response.json()['error']['code'] == 'CV_REQUEST_TOO_LARGE'
