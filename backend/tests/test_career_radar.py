"""Hybrid Career Radar: structured retrieval, trusted scores, optional LLM prose."""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from app.ai_adapter import AIAdapterRequestError
from app.approved_data import MarketRepository
from app.main import create_app
from app.models import Profile
from app.services import (
    APIError,
    career_radar_language,
    trend_package,
    validate_career_radar_narrative,
)
from app.storage import ProfileStore
from futureproof_ai.extraction import extract_profile
from futureproof_ai.retrieval import retrieve_career_candidates
from futureproof_ai.scoring import score_roles
from futureproof_ai.tencent_tokenhub_adapter import TencentTokenHubAdapter


CONSTRAINTS = {
    'weekly_hours': 5,
    'budget_amount': 0,
    'currency': 'MYR',
    'language': 'en',
    'target_weeks': 12,
    'learning_pace': 'focused',
}


def confirmed_profile(*, field_id=None, language='en') -> Profile:
    return Profile.model_validate({
        'profile_id': 'profile_career_radar',
        'current_occupation': 'Synthetic data intern',
        'skills': [
            {'skill_id': 'skill_sql', 'level': 3, 'source': 'confirmed', 'confidence': 1},
        ],
        'interests': ['analytics', 'data'],
        'preferred_field_id': field_id,
        'study_constraints': {**CONSTRAINTS, 'language': language},
        'reviewed_by_user': True,
        'revision': 2,
    })


def narrative_rows(recommendations):
    return {
        'items': [
            {
                'role_id': item['role_id'],
                'fit_summary': 'Confirmed skills and interests align with this career direction.',
                'trend_summary': 'The dated evidence supports considering this career while retaining caution.',
                'gap_summary': 'The listed skill gaps remain areas for deliberate practice.',
                'next_step': 'Complete a small synthetic project and review the result.',
                'uncertainty': 'This depends on dated evidence and user-confirmed profile inputs.',
            }
            for item in recommendations
        ]
    }


def test_structured_retrieval_is_deterministic_and_recall_first():
    profile = confirmed_profile()
    package = trend_package(MarketRepository().get_snapshot())

    first = retrieve_career_candidates(profile, package)
    second = retrieve_career_candidates(profile, package)

    assert first == second
    assert [item.role_id for item in first] == ['role_data_analyst', 'role_business_analyst']
    assert first[0].matched_skill_ids == ('skill_sql',)
    assert first[0].evidence_ids

    business = retrieve_career_candidates(
        profile.model_copy(update={'preferred_field_id': 'field_business'}), package
    )
    assert [item.role_id for item in business] == ['role_business_analyst']


def test_backend_attaches_evidence_and_rejects_generated_claims():
    profile = confirmed_profile()
    package = trend_package(MarketRepository().get_snapshot())
    recommendations = score_roles(profile, package, 'moderate')[:2]
    raw = narrative_rows(recommendations)

    result = validate_career_radar_narrative(
        raw, recommendations, 'tokenhub:minimax-m3', career_radar_language(profile)
    )
    assert result['model_version'] == 'tokenhub:minimax-m3'
    assert result['items'][0]['evidence_ids'] == recommendations[0]['evidence_ids']

    for value in (
        'Visit https://invalid.example for evidence.',
        'This role has a guaranteed outcome.',
        'Demand will grow by twenty five percent in 2027.',
    ):
        malformed = narrative_rows(recommendations)
        malformed['items'][0]['trend_summary'] = value
        with pytest.raises(APIError) as raised:
            validate_career_radar_narrative(
                malformed, recommendations, 'tokenhub:minimax-m3', 'en'
            )
        assert raised.value.code == 'MODEL_INVALID_OUTPUT'


class NarrativeAdapter:
    is_mock = True
    scoring_policy = 'tech-v1'
    extraction_model_version = 'fixture-extraction'
    scoring_model_version = 'tech-v1'
    career_radar_model_version = 'fixture-narrative'

    def extract_profile(self, text, questionnaire):
        return extract_profile(text, questionnaire)

    def score_roles(self, profile, package, scenario):
        return score_roles(profile, package, scenario)

    def generate_career_radar(self, profile, recommendations, package, scenario, language):
        raise AssertionError('The separate Career Radar model path must not run')


def _api_profile(client: TestClient):
    normalized = client.post('/api/v1/profiles/normalize', json={
        'pipeline': 'A',
        'input_type': 'form',
        'synthetic_input': True,
        'form': {
            'skills': [{'skill_id': 'skill_sql', 'level': 3}],
            'interests': ['analytics', 'data'],
            'current_occupation': 'Synthetic data intern',
        },
        'study_constraints': CONSTRAINTS,
    }).json()['data']['profile']
    response = client.post('/api/v1/profiles/confirm', json={
        'profile_id': normalized['profile_id'],
        'skills': [
            {'skill_id': 'skill_sql', 'level': 3, 'source': 'confirmed', 'confidence': 1},
        ],
        'reviewed_by_user': True,
        'profile_revision': normalized['revision'],
    })
    assert response.status_code == 200, response.text
    return response.json()['data']['profile']


def test_narrative_alias_uses_single_analysis_without_changing_scores(tmp_path):
    client = TestClient(create_app(
        store=ProfileStore(str(tmp_path / 'career-radar.sqlite')),
        adapter=NarrativeAdapter(),
    ))
    profile = _api_profile(client)
    base = {
        'profile_id': profile['profile_id'],
        'region': 'MY',
        'ai_scenario': 'moderate',
        'top_k': 2,
    }
    without = client.post('/api/v1/recommendations', json=base)
    with_narrative = client.post(
        '/api/v1/recommendations', json={**base, 'include_narrative': True}
    )

    assert without.status_code == with_narrative.status_code == 200
    assert 'career_radar' not in without.json()['data']
    assert without.json()['data']['recommendations'] == with_narrative.json()['data']['recommendations']
    assert 'career_radar' not in with_narrative.json()['data']
    assert with_narrative.json()['data']['ai_analysis']['source'] == 'rules_fallback'
    with_header = client.post(
        '/api/v1/recommendations', json={**base, 'include_narrative': True},
        headers={'X-Recommendation-Analysis': 'v1'},
    )
    assert with_header.status_code == 200
    assert with_header.json()['data']['ai_analysis'] == with_narrative.json()['data']['ai_analysis']


def test_narrative_alias_falls_back_when_live_analysis_is_disabled(tmp_path):
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / 'disabled.sqlite'))))
    profile = _api_profile(client)
    response = client.post('/api/v1/recommendations', json={
        'profile_id': profile['profile_id'],
        'region': 'MY',
        'ai_scenario': 'moderate',
        'include_narrative': True,
    })
    assert response.status_code == 200
    assert response.json()['data']['ai_analysis']['status'] == 'disabled'
    assert response.json()['data']['ai_analysis']['source'] == 'rules_fallback'


def test_synthetic_cv_skills_retrieve_roles_gaps_and_learning_map(tmp_path):
    """MiniMax extraction reaches the confirmed synthetic catalogue end to end."""
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(json.loads(request.content))
        return httpx.Response(200, json={
            'choices': [{
                'finish_reason': 'stop',
                'message': {'content': json.dumps({
                    'skills': [
                        {'skill_id': 'skill_sql', 'confidence': 0.9},
                        {'skill_id': 'skill_python', 'confidence': 0.9},
                    ],
                    'interests': ['analytics'],
                    'current_occupation': 'Synthetic data intern',
                    'unrecognized_skill_terms': [],
                })},
            }],
        })

    adapter = TencentTokenHubAdapter(
        'test-secret',
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    client = TestClient(create_app(
        store=ProfileStore(str(tmp_path / 'cv-flow.sqlite')),
        adapter=adapter,
    ))
    normalized = client.post('/api/v1/profiles/normalize', json={
        'pipeline': 'A',
        'input_type': 'synthetic_cv_text',
        'synthetic_input': True,
        'text': 'Synthetic CV: wrote SQL reports and Python scripts.',
        'study_constraints': CONSTRAINTS,
    })
    assert normalized.status_code == 200, normalized.text
    profile = normalized.json()['data']['profile']
    assert {item['skill_id'] for item in profile['skills']} == {'skill_sql', 'skill_python'}
    assert all(item['level'] is None for item in profile['skills'])

    confirmed = client.post('/api/v1/profiles/confirm', json={
        'profile_id': profile['profile_id'],
        'profile_revision': profile['revision'],
        'skills': [
            {'skill_id': 'skill_sql', 'level': 3, 'source': 'confirmed', 'confidence': 1},
            {'skill_id': 'skill_python', 'level': 3, 'source': 'confirmed', 'confidence': 1},
        ],
        'reviewed_by_user': True,
    })
    assert confirmed.status_code == 200, confirmed.text
    result = client.post('/api/v1/recommendations', json={
        'profile_id': profile['profile_id'],
        'ai_scenario': 'moderate',
    })
    assert result.status_code == 200, result.text
    assert result.json()['meta']['data_label'] == 'synthetic_demo'
    best = result.json()['data']['recommendations'][0]
    assert best['role_id'] == 'role_data_analyst'
    assert [gap['skill_id'] for gap in best['skill_gaps']] == ['skill_validation']
    assert best['evidence_ids'] == ['ev_demo_001']
    assert len(calls) == 1  # Ranking and Gap computation made no second LLM call.

    learning = client.post('/api/v1/learning/skill-map', json={
        'profile_id': profile['profile_id'],
        'role_id': best['role_id'],
        'skill_id': best['skill_gaps'][0]['skill_id'],
        'language': 'en',
        'budget_amount': 0,
        'currency': 'MYR',
    })
    assert learning.status_code == 200, learning.text
    assert learning.json()['data']['nodes']


def test_minimax_narrative_uses_structured_profile_and_validated_recommendations():
    profile = confirmed_profile()
    package = trend_package(MarketRepository().get_snapshot())
    recommendations = score_roles(profile, package, 'moderate')[:2]
    observed = {}

    def handler(request: httpx.Request) -> httpx.Response:
        observed['body'] = json.loads(request.content)
        return httpx.Response(200, json={
            'choices': [{
                'finish_reason': 'stop',
                'message': {'content': json.dumps(narrative_rows(recommendations))},
            }],
        })

    adapter = TencentTokenHubAdapter(
        'test-secret',
        narrative_enabled=True,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    output = adapter.generate_career_radar(
        profile, recommendations, package, 'moderate', 'en'
    )

    assert len(output['items']) == len(recommendations)
    assert observed['body']['model'] == 'minimax-m3'
    assert observed['body']['response_format'] == {'type': 'json_object'}
    prompt = observed['body']['messages'][1]['content']
    assert profile.profile_id not in prompt
    assert 'recommendations' in prompt
    assert 'match_score' not in prompt
    assert 'source_url' not in prompt


def test_minimax_narrative_is_opt_in():
    adapter = TencentTokenHubAdapter('test-secret')
    with pytest.raises(AIAdapterRequestError) as raised:
        adapter.generate_career_radar(
            confirmed_profile(), [], trend_package(MarketRepository().get_snapshot()),
            'moderate', 'en',
        )
    assert raised.value.code == 'SOURCE_UNAVAILABLE'


def test_position_skill_draft_is_review_only_and_rejects_dosm_groups():
    observed = []

    def handler(request: httpx.Request) -> httpx.Response:
        observed.append(json.loads(request.content))
        return httpx.Response(200, json={
            'choices': [{
                'finish_reason': 'stop',
                'message': {'content': json.dumps({
                    'skills': [{
                        'skill_id': 'skill_sql',
                        'suggested_target_level': 3,
                        'importance': 'high',
                        'rationale': 'Suggested from the named data analyst title.',
                    }],
                })},
            }],
        })

    adapter = TencentTokenHubAdapter(
        'test-secret',
        position_skill_drafts_enabled=True,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    with pytest.raises(ValueError, match='named position'):
        adapter.propose_position_skills({
            'position_id': 'occupation-professionals',
            'title': 'Professionals',
            'taxonomy_level': 'major_occupation_group',
        })
    assert not observed

    result = adapter.propose_position_skills({
        'position_id': 'role_data_analyst',
        'title': 'Data Analyst',
        'taxonomy_level': 'named_position',
    })
    assert result['status'] == 'pending_review'
    assert result['skills'][0]['skill_id'] == 'skill_sql'
    assert len(observed) == 1


def test_dosm_group_can_draft_named_positions_then_skills_without_activation():
    responses = iter([
        {"positions": [{"title": "Data Analyst", "rationale": "A plausible example only."}]},
        {"skills": [{
            "skill_id": "skill_sql",
            "suggested_target_level": 3,
            "importance": "high",
            "rationale": "A candidate requirement to review.",
        }]},
    ])

    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={
            "choices": [{
                "finish_reason": "stop",
                "message": {"content": json.dumps(next(responses))},
            }],
        })

    adapter = TencentTokenHubAdapter(
        "test-secret",
        position_skill_drafts_enabled=True,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    with pytest.raises(ValueError, match="unknown DOSM occupation group"):
        adapter.propose_named_positions("occupation-nonexistent")

    draft = adapter.propose_named_positions("occupation-professionals")
    assert draft["status"] == "pending_review"
    assert "no position-level market evidence" in draft["limitations"]
    position = draft["positions"][0]
    assert position["origin"] == "llm_draft"
    assert position["parent_occupation_group_id"] == "occupation-professionals"
    skills = adapter.propose_position_skills(position)
    assert skills["status"] == "pending_review"
    assert skills["skills"][0]["skill_id"] == "skill_sql"


def test_position_skill_draft_rejects_unknown_skill_ids():
    response = httpx.Response(200, json={
        'choices': [{
            'finish_reason': 'stop',
            'message': {'content': json.dumps({
                'skills': [{
                    'skill_id': 'skill_invented',
                    'suggested_target_level': 4,
                    'importance': 'high',
                    'rationale': 'Unsupported guess',
                }],
            })},
        }],
    })
    adapter = TencentTokenHubAdapter(
        'test-secret',
        position_skill_drafts_enabled=True,
        client=httpx.Client(transport=httpx.MockTransport(lambda _: response)),
    )
    with pytest.raises(ValueError, match='invalid position skill draft'):
        adapter.propose_position_skills({
            'position_id': 'role_data_analyst',
            'title': 'Data Analyst',
            'taxonomy_level': 'named_position',
        })


def test_postgres_migration_has_structured_rag_tables_without_vectors_or_profiles():
    migration = (
        Path(__file__).resolve().parents[1]
        / 'migrations'
        / '20261022_01_career_radar.sql'
    ).read_text(encoding='utf-8')
    for table in (
        'career_roles', 'skills', 'role_skills', 'evidence', 'trend_snapshots',
        'role_trend_signals', 'skill_trend_signals', 'scenario_assumptions',
    ):
        assert f'futureproof.{table}' in migration
    assert 'futureproof.profiles' not in migration
    assert 'create extension vector' not in migration.casefold()
    assert ' vector(' not in migration.casefold()


def test_openapi_exposes_only_optional_narrative_extension(tmp_path):
    app = create_app(store=ProfileStore(str(tmp_path / 'openapi.sqlite')))
    schemas = app.openapi()['components']['schemas']
    request = schemas['RecommendRequest']
    response = schemas['RecommendData']
    assert request['properties']['include_narrative']['default'] is False
    assert 'include_narrative' not in request['required']
    assert 'career_radar' in response['properties']
    assert 'career_radar' not in response['required']
