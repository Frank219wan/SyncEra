import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.ai_adapter import AIAdapterConfigurationError, load_ai_adapter
from app.main import create_app
from app.storage import ProfileStore
from futureproof_ai.tencent_tokenhub_adapter import TencentTokenHubAdapter
from test_api import CONSTRAINTS
from test_cv_upload import docx_bytes, pdf_bytes


def model_response(output: dict) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {"role": "assistant", "content": json.dumps(output)},
                }
            ]
        },
    )


def valid_output() -> dict:
    return {
        "skills": [
            {"skill_id": "skill_sql", "confidence": 0.7},
            {"skill_id": "skill_python", "confidence": 0.91},
        ],
        "interests": ["model-generated-interest"],
        "current_occupation": "model-generated-occupation",
        "unrecognized_skill_terms": ["Airflow"],
    }


def test_request_and_form_precedence():
    observed = {}

    def handler(request: httpx.Request) -> httpx.Response:
        observed["authorization"] = request.headers["Authorization"]
        observed["content_type"] = request.headers["Content-Type"]
        observed["body"] = json.loads(request.content)
        return model_response(valid_output())

    adapter = TencentTokenHubAdapter(
        "test-secret",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    result = adapter.extract_profile(
        "Built Python services and worked with Airflow.",
        {
            "current_occupation": "Data intern",
            "interests": ["analytics"],
            "skills": [{"skill_id": "skill_sql", "level": 3}],
        },
    )

    assert observed["authorization"] == "Bearer test-secret"
    assert observed["content_type"].startswith("application/json")
    assert observed["body"]["model"] == "minimax-m3"
    assert observed["body"]["reasoning_split"] is True
    assert observed["body"]["response_format"] == {"type": "json_object"}
    assert "UNTRUSTED synthetic demo text" in observed["body"]["messages"][0]["content"]
    assert "Built Python services" in observed["body"]["messages"][1]["content"]
    assert result["current_occupation"] == "Data intern"
    assert result["interests"] == ["analytics"]
    assert result["skills"] == [
        {"skill_id": "skill_sql", "level": 3, "source": "declared", "confidence": 1.0},
        {"skill_id": "skill_python", "level": None, "source": "inferred", "confidence": 0.91},
    ]
    assert result["unrecognized_skill_terms"] == ["Airflow"]
    assert any("Proficiency levels were not inferred" in item for item in result["warnings"])


def test_form_only_does_not_make_unnecessary_provider_call():
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("TokenHub should not be called for form-only input")

    adapter = TencentTokenHubAdapter(
        "test-secret",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    result = adapter.extract_profile(
        None,
        {"skills": [{"skill_id": "skill_excel", "level": 2}], "interests": ["business"]},
    )
    assert result["skills"][0]["skill_id"] == "skill_excel"
    assert "No free text was sent" in result["warnings"][0]


def test_model_cannot_inject_unknown_skill_or_proficiency():
    output = valid_output()
    output["skills"] = [
        {"skill_id": "skill_not_in_catalogue", "confidence": 1.0},
        {"skill_id": "skill_python", "confidence": 0.8},
    ]
    adapter = TencentTokenHubAdapter(
        "test-secret",
        client=httpx.Client(transport=httpx.MockTransport(lambda request: model_response(output))),
    )
    result = adapter.extract_profile("Python level 5", None)
    assert result["skills"] == [
        {"skill_id": "skill_python", "level": None, "source": "inferred", "confidence": 0.8}
    ]


def test_invalid_model_json_is_rejected():
    response = httpx.Response(
        200,
        json={"choices": [{"finish_reason": "stop", "message": {"content": "not-json"}}]},
    )
    adapter = TencentTokenHubAdapter(
        "test-secret",
        client=httpx.Client(transport=httpx.MockTransport(lambda request: response)),
    )
    with pytest.raises(ValueError, match="invalid profile JSON"):
        adapter.extract_profile("Python", None)


@pytest.mark.parametrize(
    "provider_status,api_status,code,retryable",
    [
        (401, 503, "SOURCE_UNAVAILABLE", False),
        (429, 429, "RATE_LIMITED", True),
        (502, 503, "SOURCE_UNAVAILABLE", True),
    ],
)
def test_provider_errors_are_sanitized(tmp_path, provider_status, api_status, code, retryable):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(provider_status, json={"error": {"message": "secret provider detail"}})

    adapter = TencentTokenHubAdapter(
        "test-secret",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / "p.sqlite")), adapter=adapter))
    response = client.post(
        "/api/v1/profiles/normalize",
        json={
            "pipeline": "A",
            "input_type": "guided_text",
            "synthetic_input": True,
            "text": "Python",
            "study_constraints": CONSTRAINTS,
        },
    )
    assert response.status_code == api_status
    assert response.json()["error"]["code"] == code
    assert response.json()["error"]["retryable"] is retryable
    assert "secret provider detail" not in response.text


def test_timeout_maps_to_504(tmp_path):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("test timeout", request=request)

    adapter = TencentTokenHubAdapter(
        "test-secret",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / "p.sqlite")), adapter=adapter))
    response = client.post(
        "/api/v1/profiles/normalize",
        json={
            "pipeline": "A",
            "input_type": "guided_text",
            "synthetic_input": True,
            "text": "Python",
            "study_constraints": CONSTRAINTS,
        },
    )
    assert response.status_code == 504
    assert response.json()["error"]["code"] == "MODEL_TIMEOUT"
    assert response.json()["error"]["retryable"] is True


def test_extraction_metadata_identifies_real_model(tmp_path):
    adapter = TencentTokenHubAdapter(
        "test-secret",
        client=httpx.Client(
            transport=httpx.MockTransport(lambda request: model_response(valid_output()))
        ),
    )
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / "p.sqlite")), adapter=adapter))
    response = client.post(
        "/api/v1/profiles/normalize",
        json={
            "pipeline": "A",
            "input_type": "guided_text",
            "synthetic_input": True,
            "text": "Python",
            "study_constraints": CONSTRAINTS,
        },
    )
    assert response.status_code == 200
    meta = response.json()["meta"]
    assert meta["model_version"] == "tokenhub:minimax-m3"
    assert meta["data_label"] == "synthetic_demo"
    assert meta["is_mock"] is True


@pytest.mark.parametrize('filename,make_file', [('fictional.pdf', pdf_bytes), ('fictional.docx', docx_bytes)])
def test_upload_uses_minimax_boundary_then_requires_confirmation(tmp_path, filename, make_file):
    observed = []

    def handler(request: httpx.Request) -> httpx.Response:
        observed.append(json.loads(request.content))
        return model_response(valid_output())

    adapter = TencentTokenHubAdapter('test-secret', client=httpx.Client(transport=httpx.MockTransport(handler)))
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / 'p.sqlite')), adapter=adapter))
    response = client.post('/api/v1/profiles/upload',
        data={'synthetic_input': 'true', 'study_constraints': json.dumps(CONSTRAINTS)},
        files={'file': (filename, make_file('Fictional synthetic CV with Python and SQL.'))})
    assert response.status_code == 200, response.text
    assert len(observed) == 1
    assert 'Fictional synthetic CV' in observed[0]['messages'][1]['content']
    assert observed[0]['model'] == 'minimax-m3'
    profile = response.json()['data']['profile']
    assert profile['reviewed_by_user'] is False
    assert response.json()['meta']['model_version'] == 'tokenhub:minimax-m3'
    blocked = client.post('/api/v1/recommendations', json={'profile_id': profile['profile_id'], 'ai_scenario': 'moderate'})
    assert blocked.status_code == 422 and blocked.json()['error']['code'] == 'PROFILE_NOT_CONFIRMED'
    skill = profile['skills'][0]
    confirmed = client.post('/api/v1/profiles/confirm', json={
        'profile_id': profile['profile_id'], 'skills': [{**skill, 'level': 3, 'source': 'confirmed'}],
        'reviewed_by_user': True, 'profile_revision': profile['revision'],
    })
    assert confirmed.status_code == 200
    recommended = client.post('/api/v1/recommendations', json={'profile_id': profile['profile_id'], 'ai_scenario': 'moderate'})
    assert recommended.status_code == 200 and recommended.json()['data']['recommendations']


def test_factory_requires_key_and_locks_model(monkeypatch):
    monkeypatch.setenv("AI_ADAPTER_MODULE", "futureproof_ai.tencent_tokenhub_adapter")
    monkeypatch.delenv("TENCENT_TOKENHUB_API_KEY", raising=False)
    with pytest.raises(AIAdapterConfigurationError):
        load_ai_adapter()

    monkeypatch.setenv("TENCENT_TOKENHUB_API_KEY", "test-secret")
    monkeypatch.setenv("TENCENT_TOKENHUB_MODEL", "unapproved-model")
    with pytest.raises(AIAdapterConfigurationError):
        load_ai_adapter()
