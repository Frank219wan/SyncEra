"""FutureProof AI deterministic Phase-1 adapter.

The package exposes the backend-compatible adapter factory plus the three
public Tech entry points requested by API Contract v1.0.
"""

from .futureproof_adapter import FutureProofAdapter, create_adapter
from .extraction import extract_profile
from .scoring import score_roles
from .trends import retrieve_trends

__all__ = [
    "FutureProofAdapter",
    "create_adapter",
    "extract_profile",
    "retrieve_trends",
    "score_roles",
]
