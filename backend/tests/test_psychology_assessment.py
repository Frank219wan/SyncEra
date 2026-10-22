from pydantic import ValidationError
from app.models import Psychology, Profile

def test_psychology_scenario_valid_and_optional():
    p=Psychology(assessment_version='1.0',assessment_type='self_report_reflection',
                 scenario_answers={'S1':'A','S2':None,'S3':'C','S4':'B','S5':'D'},
                 consent_to_personalization=True)
    assert p.scenario_answers['S2'] is None
    assert p.consent_to_personalization

def test_psychology_requires_other_text():
    try:
        Psychology(scenario_answers={'S1':'E'})
    except ValidationError:
        pass
    else:
        raise AssertionError('E must require open text')

def test_psychology_rejects_unknown_scenarios():
    try:
        Psychology(scenario_answers={'S6':'A'})
    except ValidationError:
        pass
    else:
        raise AssertionError('Unknown scenario must be rejected')

def test_nonclinical_psychology_is_not_career_score_input():
    from app.models import ScoreBreakdown
    assert abs(ScoreBreakdown(skill_compatibility=80, interests_preferences=90,
          scenario_outlook=75,transition_feasibility=80).total()-81)<1e-6
