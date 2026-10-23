from copy import deepcopy

from fastapi.testclient import TestClient

from app.main import create_app
from app.models import Envelope
from app.organization_models import HRAnalysisData, OrganizationAnalysisData
from app.storage import ProfileStore


def request_body(scenario="moderate"):
    return {
        "schema_version": "organization-v0.1",
        "synthetic_input": True,
        "workspace_id": None,
        "workspace_revision": None,
        "reviewed_by_user": True,
        "region": "MY",
        "locale": "en",
        "ai_scenario": scenario,
        "snapshot_id": None,
        "payload": {
            "institution_label": "Greenfield Institute Demo",
            "selected_member_ids": ["STU-001", "STU-002"],
            "members": [
                {
                    "member_id": "STU-001",
                    "programme": "Business Analytics",
                    "year_or_cohort": "Year 3",
                    "current_courses": ["Statistics", "Information Systems"],
                    "skills": [
                        {"skill_id": "skill_analytics", "level": 3, "source": "confirmed", "confidence": 1},
                        {"skill_id": "skill_communication", "level": 3, "source": "confirmed", "confidence": 1},
                    ],
                    "interests": ["data", "technology"],
                    "goal_tags": ["entry_level_data_role"],
                    "work_style": {"collaboration": "balanced", "pace": "structured", "structure": "guided"},
                    "target_role_id": "role_data_analyst",
                    "weekly_learning_hours": 5,
                    "reviewed": True,
                },
                {
                    "member_id": "STU-002",
                    "programme": "Computer Science",
                    "year_or_cohort": "Year 3",
                    "current_courses": ["Programming", "Databases"],
                    "skills": [
                        {"skill_id": "skill_python", "level": None, "source": "confirmed", "confidence": 1},
                        {"skill_id": "skill_sql", "level": 3, "source": "confirmed", "confidence": 1},
                    ],
                    "interests": ["ai", "automation"],
                    "goal_tags": ["digital_transformation"],
                    "work_style": {"collaboration": "collaborative", "pace": "fast", "structure": "flexible"},
                    "target_role_id": "role_ai_workflow",
                    "weekly_learning_hours": 6,
                    "reviewed": True,
                },
            ],
        },
    }


def hr_request_body(scenario="moderate", include_employees=True):
    employees = [
        {
            "member_id": "EMP-001",
            "department_id": "dept-data",
            "current_role": "Reporting analyst",
            "skills": [
                {"skill_id": "skill_sql", "level": 3, "source": "confirmed", "confidence": 1},
                {"skill_id": "skill_python", "level": 2, "source": "confirmed", "confidence": 1},
            ],
            "baseline_known": True,
            "target_role_id": "role_data_analyst",
            "weekly_learning_hours": 4,
            "reviewed": True,
        },
        {
            "member_id": "EMP-002",
            "department_id": "dept-data",
            "current_role": "Operations coordinator",
            "skills": [],
            "baseline_known": False,
            "target_role_id": None,
            "weekly_learning_hours": 3,
            "reviewed": True,
        },
    ] if include_employees else []
    return {
        "schema_version": "organization-v0.1",
        "synthetic_input": True,
        "workspace_id": None,
        "workspace_revision": None,
        "reviewed_by_user": True,
        "region": "MY",
        "locale": "en",
        "ai_scenario": scenario,
        "snapshot_id": None,
        "payload": {
            "organization_label": "Canopy Works Demo",
            "sector": "Professional services",
            "organization_goal_tags": ["internal-mobility"],
            "target_skill_ids": ["skill_sql", "skill_validation"],
            "training_budget_myr": 1200,
            "planning_horizon_weeks": 8,
            "departments": [
                {
                    "department_id": "dept-data",
                    "label": "Data Operations",
                    "responsibilities": "Prepare operational reports.",
                    "current_status": "Growing",
                    "challenges": "Manual validation workload.",
                    "headcount": 8,
                    "goal_tags": ["internal-mobility"],
                    "target_skill_ids": ["skill_python"],
                },
                {
                    "department_id": "dept-people",
                    "label": "People Operations",
                    "responsibilities": "Support employee development.",
                    "current_status": "Stable",
                    "challenges": "Training capacity is not measured.",
                    "headcount": 4,
                    "goal_tags": [],
                    "target_skill_ids": [],
                },
            ],
            "employees": employees,
        },
    }


def make_client(tmp_path):
    return TestClient(create_app(store=ProfileStore(str(tmp_path / "profiles.sqlite"))))


def analyze(client, body):
    response = client.post("/api/v1/organizations/career_centre/analyze", json=body)
    assert response.status_code == 200, response.text
    Envelope[OrganizationAnalysisData].model_validate(response.json())
    return response.json()


def test_b2_response_matches_existing_frontend_modules(tmp_path):
    payload = analyze(make_client(tmp_path), request_body())
    data = payload["data"]
    assert data["mode"] == "career_centre"
    assert data["scoring_policy"] == "organization-b2-v0.1"
    assert data["workspace_revision"] == 1
    assert payload["meta"]["data_label"] == "synthetic_demo"
    assert payload["meta"]["is_mock"] is True
    assert {item["member_id"] for item in data["student_results"]} == {"STU-001", "STU-002"}
    first = data["student_results"][0]
    assert first["selected_role_id"] == "role_data_analyst"
    assert first["action_plan"]["next_semester_courses"]
    assert first["action_plan"]["self_study_topics"]
    assert first["action_plan"]["project_or_internship"]
    assert data["cohort_result"]["proposed_workshops"]
    assert data["cohort_result"]["tutoring_focus"]
    assert data["cohort_result"]["curriculum_supplements"]


def test_b2_score_is_reproducible_and_scenario_sensitive(tmp_path):
    client = make_client(tmp_path)
    moderate = analyze(client, request_body("moderate"))["data"]
    fast = analyze(client, request_body("fast"))["data"]
    moderate_roles = {item["role_id"]: item for item in moderate["student_results"][1]["recommendations"]}
    fast_roles = {item["role_id"]: item for item in fast["student_results"][1]["recommendations"]}
    role_id = "role_ai_workflow"
    assert moderate_roles[role_id]["match_score"] != fast_roles[role_id]["match_score"]
    item = moderate_roles[role_id]
    score = item["score_breakdown"]
    expected = round(
        0.45 * score["skill_compatibility"]
        + 0.08 * score["interest_alignment"]
        + 0.07 * score["goal_alignment"]
        + 0.05 * score["work_style_alignment"]
        + 0.20 * score["scenario_outlook"]
        + 0.15 * score["transition_feasibility"],
        2,
    )
    assert item["match_score"] == expected
    assert "skill_levels" in moderate["student_results"][1]["missing_inputs"]


def test_b2_workspace_revision_cas(tmp_path):
    client = make_client(tmp_path)
    first = analyze(client, request_body())["data"]
    update = request_body()
    update["workspace_id"] = first["workspace_id"]
    update["workspace_revision"] = first["workspace_revision"]
    second = analyze(client, update)["data"]
    assert second["workspace_revision"] == 2
    stale = client.post("/api/v1/organizations/career_centre/analyze", json=update)
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "REVISION_CONFLICT"


def test_b2_rejects_invalid_selection_and_real_data(tmp_path):
    client = make_client(tmp_path)
    invalid = request_body()
    invalid["payload"]["selected_member_ids"] = ["STU-404"]
    assert client.post("/api/v1/organizations/career_centre/analyze", json=invalid).status_code == 422
    real = deepcopy(request_body())
    real["synthetic_input"] = False
    assert client.post("/api/v1/organizations/career_centre/analyze", json=real).status_code == 422


def test_b1_department_only_does_not_invent_employee_gaps(tmp_path):
    response = make_client(tmp_path).post(
        "/api/v1/organizations/hr/analyze", json=hr_request_body(include_employees=False)
    )
    assert response.status_code == 200, response.text
    Envelope[HRAnalysisData].model_validate(response.json())
    data = response.json()["data"]
    assert data["mode"] == "hr"
    assert data["scoring_policy"] == "organization-b1-v0.1"
    assert data["organization_summary"]["employee_profile_count"] == 0
    assert data["organization_summary"]["capacity"]["horizon_status"] == "not_assessed"
    for department in data["department_results"]:
        for coverage in department["skill_coverage"]:
            assert coverage["coverage_state"] == "unknown"
            assert coverage["coverage_percent"] is None
            assert coverage["missing_member_ids"] == []
        assert department["mobility_suggestions"] == []


def test_b1_employee_baseline_drives_coverage_mobility_and_scenario(tmp_path):
    client = make_client(tmp_path)
    moderate = client.post("/api/v1/organizations/hr/analyze", json=hr_request_body("moderate"))
    fast = client.post("/api/v1/organizations/hr/analyze", json=hr_request_body("fast"))
    assert moderate.status_code == 200, moderate.text
    assert fast.status_code == 200, fast.text
    data = moderate.json()["data"]
    department = next(item for item in data["department_results"] if item["department_id"] == "dept-data")
    sql = next(item for item in department["skill_coverage"] if item["skill_id"] == "skill_sql")
    validation = next(item for item in department["skill_coverage"] if item["skill_id"] == "skill_validation")
    assert sql["coverage_state"] == "measured"
    assert sql["coverage_percent"] == 100
    assert validation["coverage_percent"] == 0
    assert validation["missing_member_ids"] == ["EMP-001"]
    assert len(department["mobility_suggestions"]) == 1
    assert department["mobility_suggestions"][0]["member_id"] == "EMP-001"
    suggestion = department["mobility_suggestions"][0]
    moderate_score = suggestion["match_score"]
    assert moderate_score == round(
        0.60 * suggestion["skill_compatibility"]
        + 0.25 * suggestion["scenario_outlook"]
        + 0.15 * suggestion["transition_feasibility"],
        2,
    )
    fast_department = next(item for item in fast.json()["data"]["department_results"] if item["department_id"] == "dept-data")
    assert moderate_score != fast_department["mobility_suggestions"][0]["match_score"]
    assert data["organization_summary"]["capacity"]["budget_status"] == "not_assessed"


def test_b1_empty_skill_baseline_does_not_create_mobility_or_measured_coverage(tmp_path):
    body = hr_request_body()
    employee = body["payload"]["employees"][0]
    employee["baseline_known"] = True
    employee["skills"] = []
    response = make_client(tmp_path).post("/api/v1/organizations/hr/analyze", json=body)
    assert response.status_code == 200, response.text
    department = next(
        item for item in response.json()["data"]["department_results"]
        if item["department_id"] == "dept-data"
    )
    assert department["known_baseline_count"] == 0
    assert department["mobility_suggestions"] == []
    assert all(item["coverage_state"] == "unknown" for item in department["skill_coverage"])


def test_b1_rejects_employee_with_unknown_department(tmp_path):
    body = hr_request_body()
    body["payload"]["employees"][0]["department_id"] = "dept-missing"
    response = make_client(tmp_path).post("/api/v1/organizations/hr/analyze", json=body)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_b1_workspace_revision_cas(tmp_path):
    client = make_client(tmp_path)
    first = client.post("/api/v1/organizations/hr/analyze", json=hr_request_body()).json()["data"]
    update = hr_request_body()
    update["workspace_id"] = first["workspace_id"]
    update["workspace_revision"] = first["workspace_revision"]
    second = client.post("/api/v1/organizations/hr/analyze", json=update)
    assert second.status_code == 200
    assert second.json()["data"]["workspace_revision"] == 2
    stale = client.post("/api/v1/organizations/hr/analyze", json=update)
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "REVISION_CONFLICT"
