"""Backend adapter loaded with AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter."""

from __future__ import annotations

from typing import Any

from app.models import Profile, TrendPackage

from .extraction import extract_profile
from .scoring import score_roles


class FutureProofAdapter:
    """Deterministic and auditable Phase-1 AI implementation.

    ``is_mock`` is false because outputs are computed from the supplied profile
    and approved snapshot rather than returned from canned fixtures. The
    current implementation is rules-based, not an LLM, and deliberately does
    not infer proficiency levels that the user did not state.
    """

    is_mock = False

    def extract_profile(
        self,
        text: str | None,
        questionnaire: dict[str, Any] | None,
    ) -> dict[str, Any]:
        return extract_profile(text=text, questionnaire=questionnaire)

    def score_roles(
        self,
        profile: Profile,
        trend_package: TrendPackage,
        scenario: str,
    ) -> list[dict[str, Any]]:
        return score_roles(
            profile=profile,
            trend_package=trend_package,
            scenario=scenario,
        )


def create_adapter() -> FutureProofAdapter:
    """Return the object expected by ``app.ai_adapter.load_ai_adapter``."""

    return FutureProofAdapter()
