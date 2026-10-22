import pytest
from pydantic import ValidationError

from app.models import ConfirmRequest, NormalizeRequest, Psychology, PsychologyAssessment


def assessment_payload():
    return {
        'assessment_version': '1.0',
        'assessment_type': 'self_report_reflection',
        'scenario_answers': {'S1': 'E', 'S2': 'B', 'S3': None, 'S4': 'C', 'S5': None},
        'other_responses': {'S1': '  I would start by asking for one clear milestone.  '},
        'consent_to_personalization': True,
    }


def test_assessment_accepts_answered_and_explicitly_skipped_scenarios():
    assessment = PsychologyAssessment.model_validate(assessment_payload())
    assert assessment.scenario_answers['S1'] == 'E'
    assert assessment.scenario_answers['S3'] is None
    assert assessment.other_responses['S1'] == '  I would start by asking for one clear milestone.  '


@pytest.mark.parametrize('response', ['', '   '])
def test_option_e_requires_nonempty_written_response(response):
    payload = assessment_payload()
    payload['other_responses'] = {'S1': response}
    with pytest.raises(ValidationError):
        PsychologyAssessment.model_validate(payload)


def test_open_response_has_a_bounded_length():
    payload = assessment_payload()
    payload['other_responses'] = {'S1': 'x' * 1201}
    with pytest.raises(ValidationError):
        PsychologyAssessment.model_validate(payload)


def test_other_response_is_only_allowed_when_option_e_was_selected():
    payload = assessment_payload()
    payload['scenario_answers']['S1'] = 'A'
    with pytest.raises(ValidationError):
        PsychologyAssessment.model_validate(payload)


def test_assessment_rejects_unknown_answer_and_missing_scenario():
    payload = assessment_payload()
    payload['scenario_answers']['S2'] = 'F'
    with pytest.raises(ValidationError):
        PsychologyAssessment.model_validate(payload)
    payload = assessment_payload()
    del payload['scenario_answers']['S5']
    with pytest.raises(ValidationError):
        PsychologyAssessment.model_validate(payload)


def test_psychology_keeps_existing_fields_and_optional_assessment():
    legacy = Psychology(mbti='INTJ', character_notes='synthetic note', adaptability_self_report='steady', intrinsic_motivators=['mastery'])
    assert legacy.assessment is None
    updated = Psychology.model_validate({**legacy.model_dump(), 'assessment': assessment_payload()})
    assert updated.mbti == 'INTJ'
    assert updated.character_notes == 'synthetic note'
    assert updated.adaptability_self_report == 'steady'
    assert updated.intrinsic_motivators == ['mastery']
    assert updated.assessment.scenario_answers['S4'] == 'C'


def test_existing_normalize_and_confirm_payloads_remain_valid_without_psychology():
    normalize = NormalizeRequest.model_validate({
        'pipeline': 'A', 'input_type': 'form', 'synthetic_input': True,
        'form': {'current_occupation': 'Synthetic analyst'},
        'study_constraints': {'weekly_hours': 5, 'budget_amount': 0, 'currency': 'MYR', 'language': 'en', 'target_weeks': 12, 'learning_pace': 'focused'},
    })
    confirm = ConfirmRequest.model_validate({'profile_id': 'profile_legacy', 'skills': [], 'reviewed_by_user': True})
    assert normalize.psychology.assessment is None
    assert confirm.psychology is None
