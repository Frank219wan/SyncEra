"""Auditable role matching for API Contract v1.0."""

from __future__ import annotations

from typing import Any

from app.catalogue import ROLES
from app.models import Profile, Recommendation, ScoreBreakdown, SkillGap, TrendPackage

IMPORTANCE_WEIGHT = {"high": 3.0, "medium": 2.0, "low": 1.0}
ADJACENT_FIELDS = {
    frozenset({"field_data", "field_business"}),
}


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _skill_compatibility(profile: Profile, role: Any) -> float:
    levels = {item.skill_id: item.level for item in profile.skills}
    numerator = 0.0
    denominator = 0.0
    for requirement in role.required_skills:
        weight = IMPORTANCE_WEIGHT[requirement.importance]
        denominator += weight
        level = levels.get(requirement.skill_id)
        if level is not None:
            numerator += weight * min(1.0, level / max(1, requirement.target_level))
    return round(100.0 * numerator / denominator, 2) if denominator else 0.0


def _interest_preference(profile: Profile, role: Any) -> float:
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


def _field_adjacency(profile: Profile, role: Any) -> float:
    source = profile.preferred_field_id
    if source is None:
        return 0.5
    if source == role.field_id:
        return 1.0
    if frozenset({source, role.field_id}) in ADJACENT_FIELDS:
        return 0.8
    return 0.3


def _transition_feasibility(profile: Profile, role: Any) -> float:
    levels = {item.skill_id: item.level for item in profile.skills}
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


def _role_signal(package: TrendPackage, role_id: str) -> dict[str, Any] | None:
    return next((row for row in package.role_signals if row.get("role_id") == role_id), None)


def score_roles(
    profile: Profile,
    trend_package: TrendPackage,
    scenario: str,
) -> list[dict[str, Any]]:
    """Return deterministic recommendations accepted by Backend Phase 2.

    Formula:
      match = 0.45 skill + 0.20 interests/preferences
            + 0.20 scenario outlook + 0.15 transition feasibility

    The scenario multiplier changes only the projected outlook component. The
    observed snapshot score and observed metrics remain immutable.
    """

    if scenario not in {"moderate", "fast"}:
        raise ValueError("scenario must be 'moderate' or 'fast'")
    scenario_values = trend_package.scenario_assumptions.get(scenario)
    if not isinstance(scenario_values, dict):
        raise ValueError(f"snapshot has no {scenario!r} scenario assumptions")

    levels = {item.skill_id: item.level for item in profile.skills}
    results: list[Recommendation] = []
    for role in ROLES.values():
        if profile.preferred_field_id and role.field_id != profile.preferred_field_id:
            continue
        signal = _role_signal(trend_package, role.role_id)
        if signal is None or signal.get("trend_score") is None:
            continue
        if role.role_id not in scenario_values:
            raise ValueError(f"scenario assumptions omit {role.role_id}")

        base_outlook = float(signal["trend_score"])
        multiplier = float(scenario_values[role.role_id])
        breakdown = ScoreBreakdown(
            skill_compatibility=_skill_compatibility(profile, role),
            interests_preferences=_interest_preference(profile, role),
            scenario_outlook=round(_clamp(base_outlook * multiplier), 2),
            transition_feasibility=_transition_feasibility(profile, role),
        )
        gaps = [
            SkillGap(
                skill_id=req.skill_id,
                name=req.name,
                current_level=levels.get(req.skill_id),
                target_level=req.target_level,
                importance=req.importance,
            )
            for req in role.required_skills
            if levels.get(req.skill_id) is None or levels[req.skill_id] < req.target_level
        ]
        strengths = [
            req.skill_id
            for req in role.required_skills
            if levels.get(req.skill_id) is not None and levels[req.skill_id] >= req.target_level
        ]
        results.append(
            Recommendation(
                rank=1,
                role_id=role.role_id,
                role_name=role.name,
                match_score=breakdown.total(),
                score_breakdown=breakdown,
                strengths=strengths,
                skill_gaps=gaps,
                reason=(
                    "Deterministic match from confirmed skill levels, explicit interests/field, "
                    "study capacity, and the selected dated scenario."
                ),
                evidence_ids=list(signal.get("evidence_ids", [])),
                scenario_assumptions=[
                    f"{scenario} multiplier {multiplier:g} applied to role outlook {base_outlook:g}; "
                    "observed snapshot metrics are unchanged."
                ],
                uncertainty=(
                    f"{trend_package.uncertainty.rstrip('.; ')}; matching weights and level-to-hours conversion "
                    "are transparent Phase-1 heuristics and are not outcome-calibrated."
                ),
                sdg_links=role.sdg_links,
            )
        )

    results.sort(
        key=lambda item: (
            -item.match_score,
            -item.score_breakdown.skill_compatibility,
            -item.score_breakdown.scenario_outlook,
            -item.score_breakdown.transition_feasibility,
            item.role_id,
        )
    )
    return [
        item.model_copy(update={"rank": rank}).model_dump()
        for rank, item in enumerate(results, start=1)
    ]
