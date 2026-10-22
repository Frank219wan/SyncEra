"""Server-owned, versioned checks for recommendation values from an AI adapter.

These calculations deliberately do not call adapter code. The two policies
preserve the existing Demo and Tech scoring contracts during the handoff.
"""
from __future__ import annotations

from .catalogue import ROLES
from .models import Profile, Recommendation, ScoreBreakdown, SkillGap

SCORING_POLICIES = {'demo-v1', 'tech-v1'}
WEIGHTS = {'high': 3, 'medium': 2, 'low': 1}
ADJACENT_FIELDS = {frozenset({'field_data', 'field_business'})}


def _expected_breakdown(profile: Profile, role, snap, scenario: str, policy: str) -> ScoreBreakdown:
    owned = {skill.skill_id: skill.level for skill in profile.skills}
    weighted = sum(
        WEIGHTS[req.importance] * min(1.0, (owned.get(req.skill_id) or 0) / max(1, req.target_level))
        for req in role.required_skills
    )
    maximum = sum(WEIGHTS[req.importance] for req in role.required_skills)
    skill_score = round(100 * weighted / maximum, 2) if maximum else 0.0
    base = snap.role_scores[role.role_id]
    multiplier = snap.scenario_assumptions[scenario][role.role_id]
    outlook = round(max(0.0, min(100.0, base * multiplier)), 2)

    if policy == 'demo-v1':
        overlap = len(set(profile.interests) & set(role.interests))
        interest = round(100 * overlap / max(1, len(role.interests)), 2)
        gaps = sum(owned.get(req.skill_id) is None or owned[req.skill_id] < req.target_level for req in role.required_skills)
        transition = round(100 * (1 - gaps / len(role.required_skills)), 2)
    elif policy == 'tech-v1':
        if profile.preferred_field_id is None:
            field_match = 50.0
            adjacency = 0.5
        elif profile.preferred_field_id == role.field_id:
            field_match = 100.0
            adjacency = 1.0
        else:
            field_match = 0.0
            adjacency = 0.8 if frozenset({profile.preferred_field_id, role.field_id}) in ADJACENT_FIELDS else 0.3
        role_interests = {value.casefold() for value in role.interests}
        profile_interests = {value.casefold() for value in profile.interests}
        interest_overlap = 100.0 * len(role_interests & profile_interests) / len(role_interests) if role_interests else 50.0
        interest = round(0.60 * field_match + 0.40 * interest_overlap, 2)
        weighted_gap = sum(
            WEIGHTS[req.importance] * max(0, req.target_level - (owned.get(req.skill_id) or 0))
            for req in role.required_skills
        )
        weighted_max = sum(WEIGHTS[req.importance] * req.target_level for req in role.required_skills)
        estimated_hours = sum(
            max(0, req.target_level - (owned.get(req.skill_id) or 0)) * 20.0
            for req in role.required_skills
        )
        gap_burden = weighted_gap / weighted_max if weighted_max else 0.0
        capacity = profile.study_constraints.weekly_hours * profile.study_constraints.target_weeks
        time_fit = 1.0 if estimated_hours == 0 else min(1.0, capacity / estimated_hours)
        transition = round(max(0.0, min(100.0, 100.0 * (0.50 * (1.0 - gap_burden) + 0.35 * time_fit + 0.15 * adjacency))), 2)
    else:
        raise ValueError('unsupported scoring policy')
    return ScoreBreakdown(
        skill_compatibility=skill_score,
        interests_preferences=interest,
        scenario_outlook=outlook,
        transition_feasibility=transition,
    )


def validate_scored_recommendations(raw, profile: Profile, snap, scenario: str, policy: str) -> list[dict]:
    if policy not in SCORING_POLICIES or scenario not in ('moderate', 'fast'):
        raise ValueError('unsupported scoring context')
    if not isinstance(raw, list):
        raise ValueError('recommendations must be a list')
    values = [Recommendation.model_validate(item) for item in raw]
    eligible = {
        role_id for role_id, score in snap.role_scores.items()
        if score is not None and role_id in ROLES
        and (profile.preferred_field_id is None
             or ROLES[role_id].field_id == profile.preferred_field_id)
    }
    if not values and eligible:
        raise ValueError('eligible roles must not produce an empty recommendation')
    if policy == 'tech-v1' and (
        {item.role_id for item in values} != eligible or len(values) != len(eligible)
    ):
        raise ValueError('technical adapter omitted or duplicated an eligible role')
    seen = set()
    previous_score = float('inf')
    for rank, item in enumerate(values, 1):
        role = ROLES[item.role_id]
        if item.role_id in seen or item.rank != rank or item.match_score > previous_score:
            raise ValueError('invalid ranking')
        seen.add(item.role_id)
        previous_score = item.match_score
        if item.role_id not in snap.role_scores or snap.role_scores[item.role_id] is None:
            raise ValueError('role has no observed signal')
        expected = _expected_breakdown(profile, role, snap, scenario, policy)
        for field in ScoreBreakdown.model_fields:
            if abs(getattr(item.score_breakdown, field) - getattr(expected, field)) > 0.01:
                raise ValueError('score component does not match trusted inputs')
        if abs(item.match_score - expected.total()) > 0.01:
            raise ValueError('match score does not match trusted inputs')
        owned = {skill.skill_id: skill.level for skill in profile.skills}
        gaps = [
            SkillGap(skill_id=req.skill_id, name=req.name, current_level=owned.get(req.skill_id),
                     target_level=req.target_level, importance=req.importance)
            for req in role.required_skills
            if owned.get(req.skill_id) is None or owned[req.skill_id] < req.target_level
        ]
        strengths = [
            req.skill_id for req in role.required_skills
            if owned.get(req.skill_id) is not None and owned[req.skill_id] >= req.target_level
        ]
        if ([gap.model_dump() for gap in item.skill_gaps] != [gap.model_dump() for gap in gaps]
            or item.strengths != strengths):
            raise ValueError('skills do not match confirmed profile')
        if (item.role_name != role.name or item.evidence_ids != snap.role_evidence_ids[item.role_id]
            or item.sdg_links != role.sdg_links):
            raise ValueError('catalogue or evidence mismatch')
        multiplier = snap.scenario_assumptions[scenario][item.role_id]
        base = snap.role_scores[item.role_id]
        if policy == 'demo-v1':
            assumption = f'{scenario} assumption multiplier {multiplier}; observed signal remains {base}'
        else:
            assumption = (f'{scenario} multiplier {multiplier:g} applied to role outlook {base:g}; '
                          'observed snapshot metrics are unchanged.')
        if item.scenario_assumptions != [assumption]:
            raise ValueError('scenario explanation does not match trusted assumptions')
        if policy == 'tech-v1':
            expected_reason = (
                'Deterministic match from confirmed skill levels, explicit interests/field, '
                'study capacity, and the selected dated scenario.'
            )
            expected_uncertainty = (
                f"{snap.uncertainty.rstrip('.; ')}; matching weights and level-to-hours conversion "
                'are transparent Phase-1 heuristics and are not outcome-calibrated.'
            )
            if item.reason != expected_reason or item.uncertainty != expected_uncertainty:
                raise ValueError('explanation does not match trusted scoring policy')
        elif not item.reason.strip() or not item.uncertainty.strip():
            raise ValueError('recommendation explanation is incomplete')
    if policy == 'tech-v1':
        ordered = sorted(values, key=lambda item: (
            -item.match_score, -item.score_breakdown.skill_compatibility,
            -item.score_breakdown.scenario_outlook,
            -item.score_breakdown.transition_feasibility, item.role_id,
        ))
        if [item.role_id for item in values] != [item.role_id for item in ordered]:
            raise ValueError('recommendation tie order is not reproducible')
    return [item.model_dump() for item in values]
