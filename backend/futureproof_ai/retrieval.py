"""Deterministic structured retrieval for Career Radar.

This module deliberately does not use embeddings or an LLM. It converts a
confirmed profile and a dated TrendPackage into an auditable candidate set.
Final ranking remains the responsibility of ``tech-v1`` scoring.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.catalogue import ROLES
from app.models import Profile, TrendPackage


@dataclass(frozen=True)
class CareerCandidate:
    role_id: str
    retrieval_score: float
    matched_skill_ids: tuple[str, ...]
    matched_interests: tuple[str, ...]
    evidence_ids: tuple[str, ...]


def _tokens(value: str | None) -> set[str]:
    if not value:
        return set()
    normalized = ''.join(ch.casefold() if ch.isalnum() else ' ' for ch in value)
    return {part for part in normalized.split() if len(part) > 1}


def retrieve_career_candidates(
    profile: Profile,
    trend_package: TrendPackage,
) -> list[CareerCandidate]:
    """Return every eligible observed role in deterministic retrieval order.

    Retrieval is intentionally recall-first for the MVP: it never drops an
    eligible role. The independent scoring validator therefore still receives
    the complete candidate universe and can detect omissions or tampering.
    """

    signal_by_role = {
        row.get('role_id'): row
        for row in trend_package.role_signals
        if isinstance(row, dict) and row.get('trend_score') is not None
    }
    owned_skills = {item.skill_id for item in profile.skills}
    profile_interests = {item.casefold() for item in profile.interests}
    occupation_tokens = _tokens(profile.current_occupation)
    candidates: list[CareerCandidate] = []

    for role in ROLES.values():
        signal = signal_by_role.get(role.role_id)
        if signal is None:
            continue
        if profile.preferred_field_id and role.field_id != profile.preferred_field_id:
            continue

        required_ids = {item.skill_id for item in role.required_skills}
        matched_skills = tuple(sorted(owned_skills & required_ids))
        role_interests = {item.casefold() for item in role.interests}
        matched_interests = tuple(sorted(profile_interests & role_interests))
        role_tokens = _tokens(f'{role.name} {role.summary}')
        occupation_overlap = len(occupation_tokens & role_tokens) / max(1, len(role_tokens))
        skill_coverage = len(matched_skills) / max(1, len(required_ids))
        interest_coverage = len(matched_interests) / max(1, len(role_interests))
        trend_signal = float(signal['trend_score']) / 100.0
        retrieval_score = round(
            100.0 * (
                0.50 * skill_coverage
                + 0.25 * interest_coverage
                + 0.10 * occupation_overlap
                + 0.15 * trend_signal
            ),
            4,
        )
        candidates.append(
            CareerCandidate(
                role_id=role.role_id,
                retrieval_score=retrieval_score,
                matched_skill_ids=matched_skills,
                matched_interests=matched_interests,
                evidence_ids=tuple(signal.get('evidence_ids', [])),
            )
        )

    candidates.sort(key=lambda item: (-item.retrieval_score, item.role_id))
    return candidates
