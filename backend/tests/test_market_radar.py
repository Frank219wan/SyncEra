from fastapi.testclient import TestClient

from app.main import create_app
from app.storage import ProfileStore
from futureproof_ai.futureproof_adapter import create_adapter


def test_dosm_market_radar_is_local_only_by_default(tmp_path, monkeypatch):
    monkeypatch.delenv("DOSM_MARKET_RADAR_ENABLED", raising=False)
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / "profiles.sqlite"))))
    response = client.get("/api/v1/market/radar")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "FEATURE_DISABLED"


def test_dosm_market_radar_q2_snapshot_and_reconciled_measures(tmp_path, monkeypatch):
    monkeypatch.setenv("DOSM_MARKET_RADAR_ENABLED", "1")
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / "profiles.sqlite"))))
    response = client.get("/api/v1/market/radar")
    assert response.status_code == 200, response.text
    body = response.json()
    data = body["data"]

    assert body["meta"]["data_label"] == "public_open"
    assert body["meta"]["is_mock"] is False
    assert body["meta"]["snapshot_id"] == "dosm-market-q2-2026"
    assert data["period"] == data["data_as_of"] == "2026-Q2"
    assert data["total_job_offerings"] == 555_509
    assert data["total_qoq_change_percent"] == -11.4
    assert data["total_yoy_change_percent"] == 97.2
    assert sum(item["postings"] or 0 for item in data["occupation_groups"]) == 555_509
    assert sum(item["postings"] or 0 for item in data["industries"]) == 555_509

    professional = next(item for item in data["occupation_groups"] if item["name"] == "Professionals")
    assert professional["postings"] == 285_907
    assert professional["market_share_percent"] == 51.5
    assert professional["source_id"] == "dosm-jmi-q2-2026"
    assert professional["source_row"] == 36
    assert professional["previous_postings"] == 315_768
    assert professional["qoq_change_percent"] == -9.5
    assert data["matching_readiness"]["candidate_skills_source"] == "confirmed_profile.skills"
    assert data["matching_readiness"]["evidence_based_matching_ready"] is False

    employment = data["employment_totals"]
    assert employment["jobs"] == 9249.57
    assert employment["filled_jobs"] == 9053.84
    assert employment["vacancies"] == 195.73
    assert employment["jobs_created"] == 31.547
    assert len(data["employment_sectors"]) == 5
    assert {level["name"] for sector in data["employment_sectors"] for level in sector["skill_levels"]} == {
        "Skilled", "Semi-skilled", "Low-skilled"
    }


def test_dosm_market_radar_rejects_unavailable_period(tmp_path, monkeypatch):
    monkeypatch.setenv("DOSM_MARKET_RADAR_ENABLED", "1")
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / "profiles.sqlite"))))
    response = client.get("/api/v1/market/radar?period=2026-Q4")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "BAD_REQUEST"


def test_dosm_snapshot_is_not_a_tech_v1_matching_snapshot(tmp_path, monkeypatch):
    monkeypatch.setenv("DOSM_MARKET_RADAR_ENABLED", "1")
    client = TestClient(create_app(store=ProfileStore(str(tmp_path / "profiles.sqlite")), adapter=create_adapter()))
    market = client.get("/api/v1/market/radar").json()
    matching = client.get("/api/v1/trends/roles").json()
    market_snapshot_id = market["meta"]["snapshot_id"]
    matching_snapshot_id = matching["meta"]["snapshot_id"]
    assert market_snapshot_id != matching_snapshot_id
    assert market["meta"]["data_label"] == "public_open"
    assert matching["meta"]["is_mock"] is True

    constraints = {"weekly_hours": 5, "budget_amount": 0, "currency": "MYR", "language": "en", "target_weeks": 12, "learning_pace": "focused"}
    draft = client.post("/api/v1/profiles/normalize", json={"pipeline": "A", "input_type": "form", "synthetic_input": True,
        "form": {"current_occupation": "Fictional analyst", "skills": [{"skill_id": "skill_sql", "level": 3}]},
        "study_constraints": constraints}).json()["data"]["profile"]
    confirmed = client.post("/api/v1/profiles/confirm", json={"profile_id": draft["profile_id"],
        "skills": draft["skills"], "reviewed_by_user": True, "profile_revision": draft["revision"]})
    assert confirmed.status_code == 200
    body = {"profile_id": draft["profile_id"], "region": "MY", "ai_scenario": "moderate", "snapshot_id": market_snapshot_id}
    wrong = client.post("/api/v1/recommendations", json=body)
    assert wrong.status_code == 409
    assert wrong.json()["error"]["code"] == "SNAPSHOT_CONFLICT"
    right = client.post("/api/v1/recommendations", json={**body, "snapshot_id": matching_snapshot_id})
    assert right.status_code == 200
    assert right.json()["meta"]["snapshot_id"] == matching_snapshot_id
    assert right.json()["meta"]["model_version"] == "tech-v1"
