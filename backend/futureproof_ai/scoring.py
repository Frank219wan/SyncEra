"""Auditable role matching for API Contract v1.0."""

from __future__ import annotations

from typing import Any

from app.catalogue import ROLES
from app.matching import (
    calculate_breakdown,
    expected_reason,
    expected_scenario_explanation,
    expected_skill_gaps,
    expected_strengths,
    expected_uncertainty,
    recommendation_sort_key,
)
from app.models import Profile, Recommendation, TrendPackage

from .retrieval import retrieve_career_candidates


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

    results: list[Recommendation] = []
    candidates = retrieve_career_candidates(profile, trend_package)
    for candidate in candidates:
        role = ROLES[candidate.role_id]
        signal = _role_signal(trend_package, role.role_id)
        if signal is None or signal.get("trend_score") is None:  # defensive; retrieval already checks this
            continue
        if role.role_id not in scenario_values:
            raise ValueError(f"scenario assumptions omit {role.role_id}")

        base_outlook = float(signal["trend_score"])
        multiplier = float(scenario_values[role.role_id])
        breakdown = calculate_breakdown(profile, role, base_outlook, multiplier)
        gaps = expected_skill_gaps(profile, role)
        strengths = expected_strengths(profile, role)
        results.append(
            Recommendation(
                rank=1,
                role_id=role.role_id,
                role_name=role.name,
                match_score=breakdown.total(),
                score_breakdown=breakdown,
                strengths=strengths,
                skill_gaps=gaps,
                reason=expected_reason(),
                evidence_ids=list(signal.get("evidence_ids", [])),
                scenario_assumptions=expected_scenario_explanation(scenario, multiplier, base_outlook),
                uncertainty=expected_uncertainty(trend_package.uncertainty),
                sdg_links=role.sdg_links,
            )
        )

    results.sort(key=recommendation_sort_key)
    return [
        item.model_copy(update={"rank": rank}).model_dump()
        for rank, item in enumerate(results, start=1)
    ]
