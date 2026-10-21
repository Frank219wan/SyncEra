"""Conceptual trend retrieval entry point requested by the Tech handoff."""

from __future__ import annotations

from typing import Any

from app.catalogue import ROLES
from app.models import TrendPackage
from app.services import trend_package


def retrieve_trends(
    profile_or_cohort: Any,
    snapshot_id: str | None,
    top_k: int = 20,
    *,
    market_repository: Any,
) -> TrendPackage:
    """Load and filter a Backend repository snapshot.

    This function does not fetch the internet or bypass the repository's
    approval boundary. An isolated test repository may contain an explicitly
    labelled technical precheck. It is callable by orchestration code but is not needed by the
    current HTTP recommendation route, which already assembles TrendPackage.
    """

    if not 1 <= top_k <= 20:
        raise ValueError("top_k must be between 1 and 20")
    snapshot = market_repository.get_snapshot(snapshot_id)
    if snapshot is None:
        raise KeyError(f"unknown snapshot_id: {snapshot_id!r}")
    package = trend_package(snapshot)
    field_id = getattr(profile_or_cohort, "preferred_field_id", None)
    role_rows = [
        row
        for row in package.role_signals
        if field_id is None or ROLES[row["role_id"]].field_id == field_id
    ][:top_k]
    allowed_roles = {row["role_id"] for row in role_rows}
    scenario_assumptions = {
        name: {role_id: value for role_id, value in values.items() if role_id in allowed_roles}
        for name, values in package.scenario_assumptions.items()
    }
    return package.model_copy(
        update={
            "role_signals": role_rows,
            "scenario_assumptions": scenario_assumptions,
        }
    )
