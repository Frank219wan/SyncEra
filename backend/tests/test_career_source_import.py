import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.career_source_import import (
    CareerImportManifest, extracted_hash, reference_windows,
    select_fixed_scenario, select_market_observation,
)


SEED = Path(__file__).resolve().parents[1] / "data" / "career_sources_q2_2026_seed.json"


def payload():
    return json.loads(SEED.read_text(encoding="utf-8"))


def test_curated_official_seed_validates_and_does_not_invent_earlier_quarter():
    manifest = CareerImportManifest.model_validate(payload())
    assert len(manifest.occupations) == 2
    assert manifest.occupations[1].masco_code == "2512-01"
    assert manifest.demand_quarters[0].unit_group_code == "2512"
    assert len(extracted_hash(manifest, manifest.sources[0].source_id)) == 64
    window = reference_windows(manifest)[0]
    assert window["moderate"] == "2023-Q2"
    assert window["fast"] == "2026-Q2"
    assert window["available_periods"] == ["2023-Q2", "2026-Q2"]


def test_fixed_legacy_scenarios_have_distinct_dated_observations():
    manifest = CareerImportManifest.model_validate(payload())
    common = {"unit_group_code": "2512", "region": "MY"}
    moderate = select_fixed_scenario(manifest, **common, scenario="moderate")
    fast = select_fixed_scenario(manifest, **common, scenario="fast")
    assert (moderate["selected_period"], moderate["job_offerings"]) == ("2023-Q2", 7779)
    assert (fast["selected_period"], fast["job_offerings"]) == ("2026-Q2", 19899)
    assert moderate["quality_status"] == "method_pending"
    assert moderate["measurement_series_id"] != fast["measurement_series_id"]
    assert moderate["total_job_offerings"] == 261231
    assert fast["total_job_offerings"] == 555509
    assert moderate["market_share_percent"] == 2.98
    assert fast["market_share_percent"] == 3.58
    assert moderate["market_signal_score"] == 59.56
    assert fast["market_signal_score"] == 71.64
    assert moderate["market_signal_method_version"] == fast["market_signal_method_version"]


def test_archived_conflicting_quarter_does_not_enter_optional_selection():
    manifest = CareerImportManifest.model_validate(payload())
    common = {
        "unit_group_code": "2512", "region": "MY",
        "measurement_series_id": "dosm-jmi-online-job-offerings-v1",
    }
    moderate = select_market_observation(manifest, **common, speed_percent=0)
    fast = select_market_observation(manifest, **common, speed_percent=100)
    assert (moderate["selected_period"], moderate["job_offerings"]) == ("2026-Q2", 19899)
    assert (fast["selected_period"], fast["job_offerings"]) == ("2026-Q2", 19899)
    assert moderate["source_url"].startswith("https://www.dosm.gov.my/")
    assert moderate["market_granularity"] == "masco_unit_group_4_digit"
    assert fast["published_at"] == "2026-08-18"


def test_cannot_assign_group_count_to_named_occupation():
    data = payload()
    data["demand_quarters"][0]["unit_group_code"] = "2512-01"
    with pytest.raises(ValidationError):
        CareerImportManifest.model_validate(data)


def test_unofficial_source_url_is_rejected():
    data = payload()
    data["sources"][0]["source_url"] = "https://not-dosm.example/report"
    with pytest.raises(ValidationError, match="official HTTPS URL"):
        CareerImportManifest.model_validate(data)


def test_official_skill_must_cite_named_role_page():
    data = payload()
    data["skill_assertions"][0]["source_id"] = "src_emasco_2512_20261023"
    with pytest.raises(ValidationError, match="named role page"):
        CareerImportManifest.model_validate(data)


def test_ai_generated_requirement_needs_model_and_prompt_provenance():
    data = payload()
    data["skill_assertions"][0].update(origin="ai_generated", source_id=None, source_excerpt=None)
    with pytest.raises(ValidationError, match="AI mapping needs model"):
        CareerImportManifest.model_validate(data)


def test_ai_generated_requirement_cannot_claim_official_excerpt():
    data = payload()
    data["skill_assertions"][0].update(
        origin="ai_generated",
        model_version="tokenhub:minimax-m3",
        prompt_version="role-skills-v1",
        generated_at="2026-10-23T04:41:00Z",
    )
    with pytest.raises(ValidationError, match="cannot masquerade"):
        CareerImportManifest.model_validate(data)


def test_active_role_needs_active_requirement():
    data = payload()
    next(row for row in data["occupations"] if row["role_id"])["is_active"] = True
    for assertion in data["skill_assertions"]:
        assertion["status"] = "draft"
    with pytest.raises(ValidationError, match="active named role"):
        CareerImportManifest.model_validate(data)


def test_seed_keeps_unapproved_role_and_assertions_inactive():
    manifest = CareerImportManifest.model_validate(payload())
    assert not any(row.is_active for row in manifest.occupations)
    assert all(row.status == "draft" for row in manifest.skill_assertions)


def test_prior_year_quarter_can_be_added_without_changing_existing_source():
    data = payload()
    data["scenario_anchors"] = []
    data["sources"].append({
        "source_id": "src_dosm_job_market_2025q2_test",
        "provider": "dosm",
        "source_url": "https://www.dosm.gov.my/site/downloadrelease?id=example-2025q2",
        "source_version": "test fixture",
        "published_at": "2025-08-18",
        "collected_at": "2026-10-23T04:41:00Z",
        "method_version": "test-only",
    })
    data["demand_quarters"].append({
        "unit_group_code": "2512", "period": "2025-Q2", "region": "MY",
        "job_offerings": 18000,
        "total_job_offerings": 500000,
        "measurement_series_id": "dosm-jmi-online-job-offerings-v1",
        "quality_status": "clear",
        "scenario_eligible": True,
        "source_id": "src_dosm_job_market_2025q2_test",
        "source_row": "test-only fabricated observation",
        "limitation": "Fictional prior-year count used only by a unit test.",
    })
    manifest = CareerImportManifest.model_validate(data)
    window = reference_windows(manifest)[0]
    assert window["moderate"] == "2025-Q2"
    assert window["fast"] == "2026-Q2"


def test_ineligible_or_different_series_is_not_silently_compared():
    data = payload()
    data["scenario_anchors"] = []
    for row in data["demand_quarters"]:
        row["scenario_eligible"] = False
    assert reference_windows(CareerImportManifest.model_validate(data)) == []


def test_conflicted_official_value_cannot_be_enabled_for_slider():
    data = payload()
    q1 = next(row for row in data["demand_quarters"] if row["period"] == "2026-Q1")
    q1["quality_status"] = "conflicted"
    q1["scenario_eligible"] = True
    with pytest.raises(ValidationError, match="only clear or explicitly reviewed observations"):
        CareerImportManifest.model_validate(data)


def test_unresolved_conflict_cannot_be_fixed_scenario_anchor():
    data = payload()
    next(row for row in data["demand_quarters"] if row["period"] == "2023-Q2")["quality_status"] = "conflicted"
    with pytest.raises(ValidationError, match="unresolved conflicting observation"):
        CareerImportManifest.model_validate(data)
