"""Backend adapter loaded with AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter."""

from __future__ import annotations

from typing import Any

from app.models import Profile, TrendPackage

from .extraction import extract_profile
from .scoring import score_roles


class FutureProofAdapter:
    """Deterministic and auditable Phase-1 AI implementation.

    Outputs are computed from supplied inputs. Synthetic data and rule-based
    extraction remain explicitly labelled as mock; this is not LLM inference.
    Proficiency levels are never inferred when the user did not state them.
    """

    is_mock = True
    scoring_policy = 'tech-v1'
    extraction_model_version = 'rules-v0.1'
    scoring_model_version = 'tech-v1'

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
