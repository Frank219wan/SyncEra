"""Map a user-selected AI-development-speed proxy to observed DOSM quarters.

The slider selects a historical market reference; it does not forecast jobs or
prove that AI caused changes in job adverts. No count or skill is interpolated.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable


METHOD_VERSION = "historical-quarter-reference-v1"
MARKET_SIGNAL_METHOD_VERSION = "within-report-share-5pct-cap-v1"
_QUARTER = re.compile(r"^(\d{4})-Q([1-4])$")


def quarter_number(period: str) -> int:
    match = _QUARTER.fullmatch(period)
    if not match:
        raise ValueError("period must use YYYY-Q1 through YYYY-Q4")
    return int(match.group(1)) * 4 + int(match.group(2)) - 1


def market_signal_from_report_share(group_count: int, report_total: int) -> dict[str, object]:
    """Return a project heuristic, not an official DOSM or AI-development score.

    Five percent of all adverts in one report maps to 100. Keeping both the
    numerator and denominator visible makes the component reproducible. It is
    not a verified cross-year growth rate or a named-position demand count.
    """

    if (isinstance(group_count, bool) or isinstance(report_total, bool)
            or not isinstance(group_count, int) or not isinstance(report_total, int)
            or group_count < 0 or report_total <= 0 or group_count > report_total):
        raise ValueError("counts must be non-negative integers and group_count <= report_total")
    share = Decimal(group_count) / Decimal(report_total)
    two_places = Decimal("0.01")
    return {
        "market_share_percent": float((share * 100).quantize(two_places, rounding=ROUND_HALF_UP)),
        "market_signal_score": float(min(Decimal(100), share * 2000).quantize(
            two_places, rounding=ROUND_HALF_UP)),
        "market_signal_method_version": MARKET_SIGNAL_METHOD_VERSION,
        "market_signal_basis": "Within-report group share; 5% of all adverts maps to 100 (project heuristic)",
    }


@dataclass(frozen=True)
class HistoricalReference:
    speed_percent: int
    selected_period: str
    moderate_period: str
    fast_period: str
    available_periods: tuple[str, ...]
    method_version: str
    limitation: str


def select_historical_reference(
    periods: Iterable[str],
    *,
    speed_percent: int,
    moderate_period: str | None = None,
    fast_period: str | None = None,
) -> HistoricalReference:
    """Select one *observed* quarter from a comparable, curated period range.

    0 is the earlier Moderate anchor; 100 is the later Fast anchor. A discrete
    selection avoids fabricating market counts or skill requirements between
    observed quarters. Callers must curate the range for source comparability.
    """

    if isinstance(speed_percent, bool) or not isinstance(speed_percent, int) or not 0 <= speed_percent <= 100:
        raise ValueError("speed_percent must be an integer between 0 and 100")
    available = tuple(sorted(set(periods), key=quarter_number))
    if not available:
        raise ValueError("at least one observed quarter is required")
    moderate = moderate_period or available[0]
    fast = fast_period or available[-1]
    if moderate not in available or fast not in available:
        raise ValueError("scenario anchors must be observed quarters")
    start, end = available.index(moderate), available.index(fast)
    if start > end:
        raise ValueError("Moderate anchor must not be newer than Fast anchor")
    candidates = available[start : end + 1]
    index = (speed_percent * (len(candidates) - 1) + 50) // 100
    return HistoricalReference(
        speed_percent=speed_percent,
        selected_period=candidates[index],
        moderate_period=moderate,
        fast_period=fast,
        available_periods=candidates,
        method_version=METHOD_VERSION,
        limitation=(
            "Observed DOSM job-ad quarters are used as a product proxy for an AI-speed "
            "scenario. This is not a causal AI measure or a future forecast; role-level "
            "counts and historical skill requirements require their own evidence."
        ),
    )
