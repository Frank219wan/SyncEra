"""Recall-first, deterministic role retrieval for the tech-v1 trend package.

The DOSM market summary has no named role skill requirements and is never an
input here. Retrieval changes neither the scoring formula nor final ranking.
"""
from __future__ import annotations

from app.catalogue import ROLES
from app.models import Profile, TrendPackage


def eligible_role_ids(profile: Profile, package: TrendPackage) -> list[str]:
    signals = {
        row.get('role_id') for row in package.role_signals
        if isinstance(row, dict) and row.get('trend_score') is not None
    }
    return [role.role_id for role in ROLES.values()
            if role.role_id in signals
            and (not profile.preferred_field_id or role.field_id == profile.preferred_field_id)]
