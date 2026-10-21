"""Contract and vertical-slice tests for the Tech Phase-1 delivery."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.approved_data import MarketRepository, ResourceRepository
from app.main import create_app
from app.models import Recommendation
from app.storage import ProfileStore
from futureproof_ai import extract_profile, retrieve_trends, score_roles
from futureproof_ai.futureproof_adapter import create_adapter


ROOT = Path(__file__).resolve().parents[1]
DELIVERY = ROOT / "tech_delivery"
CONSTRAINTS = {
    "weekly_hours": 5,
    "budget_amount": 100,
    "currency": "MYR",
    "language": "en",
    "target_weeks": 12,
    "learning_pace": "focused",
}


def _read(name: str):
    return json.loads((DELIVERY / name).read_text(encoding="utf-8"))


def _repositories():
    snapshot = _read("snapshot_dosm_mycol_my_2026q2_v1.json")
    source_precheck = _read("source_approvals_TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION.json")
    market = MarketRepository(active_snapshot_id=snapshot["snapshot_id"])
    market.import_public(snapshot, source_precheck)
    market.validate_active()

    resources = ResourceRepository()
    resources.import_approved(
        _read("resources_python_p1.json"),
        _read("resource_approvals_TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION.json"),
    )
    return market, resources


def _confirmed_profile(client: TestClient) -> dict:
    normalized = client.post(
        "/api/v1/profiles/normalize",
        json={
            "pipeline": "A",
            "input_type": "form",
            "synthetic_input": True,
            "form": {
                "skills": [{"skill_id": "skill_sql", "level": 3}],
                "interests": ["analytics", "data"],
                "current_occupation": "Operations Assistant",
            },
            "preferred_field_id": "field_data",
            "study_constraints": CONSTRAINTS,
        },
    )
    assert normalized.status_code == 200, normalized.text
    assert normalized.json()["meta"]["is_mock"] is True
    profile = normalized.json()["data"]["profile"]
    confirmed = client.post(
        "/api/v1/profiles/confirm",
        json={
            "profile_id": profile["profile_id"],
            "skills": [
                {
                    "skill_id": "skill_sql",
                    "level": 3,
                    "source": "confirmed",
                    "confidence": 1.0,
                }
            ],
            "reviewed_by_user": True,
            "profile_revision": profile["revision"],
        },
    )
    assert confirmed.status_code == 200, confirmed.text
    return confirmed.json()["data"]["profile"]


def test_extraction_never_invents_proficiency():
    output = extract_profile(
        "I use SQL and Python for data tasks.",
        {
            "skills": [{"skill_id": "skill_sql", "level": 3}],
            "interests": ["analytics", "analytics"],
        },
    )
    skills = {item["skill_id"]: item for item in output["skills"]}
    assert skills["skill_sql"]["level"] == 3
    assert skills["skill_sql"]["source"] == "declared"
    assert skills["skill_python"]["level"] is None
    assert skills["skill_python"]["source"] == "inferred"
    assert output["interests"] == ["analytics"]


def test_candidate_snapshot_and_resource_pass_backend_import_boundary():
    market, resources = _repositories()
    snapshot = market.get_snapshot("snap_my_dosm_mycol_2026q2_v1")
    assert snapshot.is_mock is False
    assert snapshot.role_metrics["role_data_analyst"]["valid_postings"] == 3053
    assert snapshot.role_scores["role_data_analyst"] == 46.5
    resource = resources.select("skill_python", "en", "MYR", 0)
    assert resource is not None
    assert resource.cost_amount == 0
    assert resource.estimated_hours == 3.2


def test_retrieve_and_score_are_reproducible():
    from app.models import Profile

    market, _ = _repositories()
    profile = Profile.model_validate(
        {
            "profile_id": "profile_reproducible",
            "skills": [
                {
                    "skill_id": "skill_sql",
                    "level": 3,
                    "source": "confirmed",
                    "confidence": 1.0,
                }
            ],
            "interests": ["analytics", "data"],
            "preferred_field_id": "field_data",
            "study_constraints": CONSTRAINTS,
            "reviewed_by_user": True,
        }
    )
    package = retrieve_trends(
        profile,
        "snap_my_dosm_mycol_2026q2_v1",
        market_repository=market,
    )
    before = package.model_dump()
    moderate_a = score_roles(profile, package, "moderate")
    moderate_b = score_roles(profile, package, "moderate")
    fast = score_roles(profile, package, "fast")

    assert moderate_a == moderate_b
    assert package.model_dump() == before
    assert moderate_a[0]["score_breakdown"]["scenario_outlook"] == 46.5
    assert fast[0]["score_breakdown"]["scenario_outlook"] == 48.83
    assert moderate_a[0]["match_score"] != fast[0]["match_score"]
    assert moderate_a[0]["evidence_ids"] == [
        "ev_dosm_jmi_2026q2_business_data_analyst",
        "ev_talentcorp_mycol_2024_2025_data_professionals",
    ]
    assert all(Recommendation.model_validate(item) for item in moderate_a + fast)


def test_a_flow_real_snapshot_adapter_and_skill_resource(tmp_path):
    market, resources = _repositories()
    client = TestClient(
        create_app(
            store=ProfileStore(str(tmp_path / "profiles.sqlite")),
            adapter=create_adapter(),
            market=market,
            resources=resources,
        )
    )
    profile = _confirmed_profile(client)

    moderate = client.post(
        "/api/v1/recommendations",
        json={
            "profile_id": profile["profile_id"],
            "region": "MY",
            "ai_scenario": "moderate",
            "preferred_field_id": "field_data",
            "snapshot_id": "snap_my_dosm_mycol_2026q2_v1",
        },
    )
    fast = client.post(
        "/api/v1/recommendations",
        json={
            "profile_id": profile["profile_id"],
            "region": "MY",
            "ai_scenario": "fast",
            "preferred_field_id": "field_data",
            "snapshot_id": "snap_my_dosm_mycol_2026q2_v1",
        },
    )
    assert moderate.status_code == fast.status_code == 200
    rec_m = moderate.json()["data"]["recommendations"][0]
    rec_f = fast.json()["data"]["recommendations"][0]
    assert rec_m["match_score"] != rec_f["match_score"]
    assert {gap["skill_id"] for gap in rec_m["skill_gaps"]} == {
        "skill_python",
        "skill_validation",
    }
    assert moderate.json()["meta"]["snapshot_id"] == "snap_my_dosm_mycol_2026q2_v1"
    assert moderate.json()["meta"]["data_label"] == "mixed_demo"
    assert moderate.json()["meta"]["is_mock"] is True

    skill_map = client.post(
        "/api/v1/learning/skill-map",
        json={
            "profile_id": profile["profile_id"],
            "role_id": "role_data_analyst",
            "skill_id": "skill_python",
            "language": "en",
            "budget_amount": 0,
            "currency": "MYR",
        },
    )
    assert skill_map.status_code == 200, skill_map.text
    resource = skill_map.json()["data"]["nodes"][0]["resource"]
    assert resource["resource_id"] == "resource_mslearn_python_fundamentals_p1"
    assert resource["url"].startswith("https://learn.microsoft.com/")


def test_request_level_preferred_field_override_reaches_adapter(tmp_path):
    client = TestClient(
        create_app(
            store=ProfileStore(str(tmp_path / "field_override.sqlite")),
            adapter=create_adapter(),
        )
    )
    normalized = client.post(
        "/api/v1/profiles/normalize",
        json={
            "pipeline": "A",
            "input_type": "form",
            "synthetic_input": True,
            "form": {
                "skills": [{"skill_id": "skill_excel", "level": 3}],
                "interests": ["business"],
            },
            "study_constraints": CONSTRAINTS,
        },
    ).json()["data"]["profile"]
    confirmed = client.post(
        "/api/v1/profiles/confirm",
        json={
            "profile_id": normalized["profile_id"],
            "skills": [
                {
                    "skill_id": "skill_excel",
                    "level": 3,
                    "source": "confirmed",
                    "confidence": 1.0,
                }
            ],
            "reviewed_by_user": True,
            "profile_revision": normalized["revision"],
        },
    ).json()["data"]["profile"]

    response = client.post(
        "/api/v1/recommendations",
        json={
            "profile_id": confirmed["profile_id"],
            "region": "MY",
            "ai_scenario": "moderate",
            "preferred_field_id": "field_business",
        },
    )
    assert response.status_code == 200, response.text
    recommendations = response.json()["data"]["recommendations"]
    assert recommendations
    assert {item["role_id"] for item in recommendations} == {"role_business_analyst"}


def test_backend_rejects_semantically_false_adapter_explanation(tmp_path):
    class SemanticallyWrongAdapter:
        is_mock = False
        scoring_policy = 'tech-v1'

        def extract_profile(self, text, questionnaire):
            return create_adapter().extract_profile(text, questionnaire)

        def score_roles(self, profile, trend_package, scenario):
            result = score_roles(profile, trend_package, scenario)
            result[0]["strengths"] = ["skill_excel"]
            result[0]["skill_gaps"][0].update(
                {
                    "name": "Wrong catalogue name",
                    "current_level": 5,
                    "target_level": 0,
                    "importance": "low",
                }
            )
            return result

    client = TestClient(
        create_app(
            store=ProfileStore(str(tmp_path / "semantic_validation.sqlite")),
            adapter=SemanticallyWrongAdapter(),
        )
    )
    profile = _confirmed_profile(client)
    response = client.post(
        "/api/v1/recommendations",
        json={
            "profile_id": profile["profile_id"],
            "region": "MY",
            "ai_scenario": "moderate",
            "preferred_field_id": "field_data",
        },
    )
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "MODEL_INVALID_OUTPUT"

    class MisleadingNarrativeAdapter:
        is_mock = False
        scoring_policy = 'tech-v1'

        def extract_profile(self, text, questionnaire):
            return create_adapter().extract_profile(text, questionnaire)

        def score_roles(self, profile, trend_package, scenario):
            result = score_roles(profile, trend_package, scenario)
            result[0]["reason"] = "Confirmed skill proves this candidate is guaranteed to be hired."
            return result

    narrative_client = TestClient(
        create_app(
            store=ProfileStore(str(tmp_path / "narrative_validation.sqlite")),
            adapter=MisleadingNarrativeAdapter(),
        )
    )
    narrative_profile = _confirmed_profile(narrative_client)
    narrative_response = narrative_client.post(
        "/api/v1/recommendations",
        json={
            "profile_id": narrative_profile["profile_id"],
            "region": "MY",
            "ai_scenario": "moderate",
            "preferred_field_id": "field_data",
        },
    )
    assert narrative_response.status_code == 502
    assert narrative_response.json()["error"]["code"] == "MODEL_INVALID_OUTPUT"
