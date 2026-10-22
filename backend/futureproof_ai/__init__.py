"""FutureProof AI deterministic Phase-1 adapter.

The package exposes the backend-compatible adapter factory, API Contract v1.0
entry points, and deterministic Career Radar retrieval.
"""

from .futureproof_adapter import FutureProofAdapter, create_adapter
from .extraction import extract_profile
from .scoring import score_roles
from .trends import retrieve_trends
from .retrieval import retrieve_career_candidates

__all__ = [
    "FutureProofAdapter",
    "create_adapter",
    "extract_profile",
    "retrieve_trends",
    "retrieve_career_candidates",
    "score_roles",
]
