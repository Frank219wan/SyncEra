"""Authoritative, reproducible matching calculations for API Contract v1.0."""

from __future__ import annotations

from .models import Profile, Recommendation, Role, ScoreBreakdown, SkillGap


IMPORTANCE_WEIGHT = {"high": 3.0, "medium": 2.0, "low": 1.0}
ADJACENT_FIELDS = {
    frozenset({"field_data", "field_business"}),
}
MATCH_REASON = (
    "Deterministic match from confirmed skill levels, explicit interests/field, "
    "study capacity, and the selected dated scenario."
)


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _levels(profile: Profile) -> dict[str, int | None]:
    return {item.skill_id: item.level for item in profile.skills}


def skill_compatibility(profile: Profile, role: Role) -> float:
    levels = _levels(profile)
    numerator = 0.0
    denominator = 0.0
    for requirement in role.required_skills:
        weight = IMPORTANCE_WEIGHT[requirement.importance]
        denominator += weight
        level = levels.get(requirement.skill_id)
        if level is not None:
            numerator += weight * min(1.0, level / max(1, requirement.target_level))
    return round(100.0 * numerator / denominator, 2) if denominator else 0.0


def interest_preference(profile: Profile, role: Role) -> float:
    if profile.preferred_field_id is None:
        field_match = 50.0
    elif profile.preferred_field_id == role.field_id:
        field_match = 100.0
    else:
        field_match = 0.0

    role_interests = {value.casefold() for value in role.interests}
    profile_interests = {value.casefold() for value in profile.interests}
    interest_overlap = (
        100.0 * len(role_interests & profile_interests) / len(role_interests)
        if role_interests
        else 50.0
    )
    return round(0.60 * field_match + 0.40 * interest_overlap, 2)


def _field_adjacency(profile: Profile, role: Role) -> float:
    source = profile.preferred_field_id
    if source is None:
        return 0.5
    if source == role.field_id:
        return 1.0
    if frozenset({source, role.field_id}) in ADJACENT_FIELDS:
        return 0.8
    return 0.3


def transition_feasibility(profile: Profile, role: Role) -> float:
    levels = _levels(profile)
    weighted_gap = 0.0
    weighted_max = 0.0
    estimated_hours = 0.0
    for requirement in role.required_skills:
        weight = IMPORTANCE_WEIGHT[requirement.importance]
        current = levels.get(requirement.skill_id)
        current_numeric = 0 if current is None else current
        missing_levels = max(0, requirement.target_level - current_numeric)
        weighted_gap += weight * missing_levels
        weighted_max += weight * requirement.target_level
        estimated_hours += missing_levels * 20.0

    gap_burden = weighted_gap / weighted_max if weighted_max else 0.0
    capacity = profile.study_constraints.weekly_hours * profile.study_constraints.target_weeks
    time_fit = 1.0 if estimated_hours == 0 else min(1.0, capacity / estimated_hours)
    adjacency = _field_adjacency(profile, role)
    value = 100.0 * (0.50 * (1.0 - gap_burden) + 0.35 * time_fit + 0.15 * adjacency)
    return round(_clamp(value), 2)


def calculate_breakdown(
    profile: Profile,
    role: Role,
    base_outlook: float,
    scenario_multiplier: float,
) -> ScoreBreakdown:
    """Calculate the four contract components from authoritative inputs."""

    return ScoreBreakdown(
        skill_compatibility=skill_compatibility(profile, role),
        interests_preferences=interest_preference(profile, role),
        scenario_outlook=round(_clamp(base_outlook * scenario_multiplier), 2),
        transition_feasibility=transition_feasibility(profile, role),
    )


def expected_strengths(profile: Profile, role: Role) -> list[str]:
    levels = _levels(profile)
    return [
        requirement.skill_id
        for requirement in role.required_skills
        if levels.get(requirement.skill_id) is not None
        and levels[requirement.skill_id] >= requirement.target_level
    ]


def expected_skill_gaps(profile: Profile, role: Role) -> list[SkillGap]:
    levels = _levels(profile)
    return [
        SkillGap(
            skill_id=requirement.skill_id,
            name=requirement.name,
            current_level=levels.get(requirement.skill_id),
            target_level=requirement.target_level,
            importance=requirement.importance,
        )
        for requirement in role.required_skills
        if levels.get(requirement.skill_id) is None
        or levels[requirement.skill_id] < requirement.target_level
    ]


def expected_reason() -> str:
    return MATCH_REASON


def expected_scenario_explanation(scenario: str, multiplier: float, base_outlook: float) -> list[str]:
    return [
        f"{scenario} multiplier {multiplier:g} applied to role outlook {base_outlook:g}; "
        "observed snapshot metrics are unchanged."
    ]


def expected_uncertainty(snapshot_uncertainty: str) -> str:
    return (
        f"{snapshot_uncertainty.rstrip('.; ')}; matching weights and level-to-hours conversion "
        "are transparent Phase-1 heuristics and are not outcome-calibrated."
    )


def recommendation_sort_key(recommendation: Recommendation) -> tuple[float, float, float, float, str]:
    return (
        -recommendation.match_score,
        -recommendation.score_breakdown.skill_compatibility,
        -recommendation.score_breakdown.scenario_outlook,
        -recommendation.score_breakdown.transition_feasibility,
        recommendation.role_id,
    )
