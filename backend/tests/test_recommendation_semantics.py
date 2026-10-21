"""Model output must agree with the confirmed profile and dated snapshot."""

from copy import deepcopy

import pytest

from app.approved_data import MarketRepository
from app.models import Profile
from app.services import APIError, demo_recommendations, validate_recommendations


@pytest.fixture
def recommendation_inputs():
    profile = Profile.model_validate({
        "profile_id": "profile_semantics",
        "skills": [{"skill_id": "skill_sql", "level": 3, "source": "confirmed", "confidence": 1}],
        "interests": ["analytics"],
        "reviewed_by_user": True,
        "study_constraints": {
            "weekly_hours": 5, "budget_amount": 0, "currency": "MYR",
            "language": "en", "target_weeks": 12, "learning_pace": "focused",
        },
    })
    snapshot = MarketRepository().get_snapshot()
    output = demo_recommendations(profile, snapshot, "moderate", None, 5)
    assert len(output) >= 2
    return profile, snapshot, output


def test_valid_recommendations_match_confirmed_inputs(recommendation_inputs):
    profile, snapshot, output = recommendation_inputs
    checked = validate_recommendations(output, snapshot, "moderate", profile)
    assert [item["rank"] for item in checked] == list(range(1, len(output) + 1))


@pytest.mark.parametrize("change", [
    lambda rows: rows[0].update(rank=2),
    lambda rows: rows[1].update(role_id=rows[0]["role_id"]),
    lambda rows: rows[0].update(strengths=["skill_python"]),
    lambda rows: rows[0]["skill_gaps"][0].update(current_level=5),
    lambda rows: rows[0]["score_breakdown"].update(scenario_outlook=0),
    lambda rows: rows[0].update(evidence_ids=[]),
])
def test_semantically_false_model_output_is_rejected(recommendation_inputs, change):
    profile, snapshot, output = recommendation_inputs
    malformed = deepcopy(output)
    change(malformed)
    with pytest.raises(APIError) as raised:
        validate_recommendations(malformed, snapshot, "moderate", profile)
    assert raised.value.status == 502
    assert raised.value.code == "MODEL_INVALID_OUTPUT"
