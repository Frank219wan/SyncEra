"""Serve the locally prepared DOSM JMI and QES market-radar snapshot."""
from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from .models import MarketRadarData


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "dosm_market_q2_2026.json"
PERIOD_PATTERN = re.compile(r"^(\d{4})-Q([1-4])$")
QES_METRICS = ("jobs", "filled_jobs", "vacancies", "jobs_created")


class MarketRadarError(ValueError):
    pass


@lru_cache(maxsize=1)
def load_market_data() -> dict[str, Any]:
    if not DATA_PATH.is_file():
        raise RuntimeError("The prepared DOSM market-radar snapshot is missing.")
    with DATA_PATH.open(encoding="utf-8") as stream:
        data = json.load(stream)
    if data.get("data_as_of") != "2026-Q2" or not data.get("periods"):
        raise RuntimeError("The prepared DOSM market-radar snapshot is incomplete.")
    return data


def _period_order(period: str) -> tuple[int, int]:
    match = PERIOD_PATTERN.fullmatch(period)
    if not match:
        raise MarketRadarError("Period must use YYYY-Qn format.")
    return int(match.group(1)), int(match.group(2))


def _compare(values: dict[str, Any], period: str, periods: list[str]) -> dict[str, Any]:
    current = values.get(period)
    current_position = periods.index(period)
    previous_period = periods[current_position - 1] if current_position > 0 else None
    year, quarter = _period_order(period)
    year_ago_period = f"{year - 1:04d}-Q{quarter}"
    previous = values.get(previous_period) if previous_period else None
    year_ago = values.get(year_ago_period)

    def percent_change(base: Any) -> float | None:
        if current is None or base is None or base == 0:
            return None
        return round((current - base) / base * 100, 1)

    return {
        "current": current,
        "previous": previous,
        "year_ago": year_ago,
        "qoq": percent_change(previous),
        "yoy": percent_change(year_ago),
    }


def _jmi_signal(source: dict, period: str, periods: list[str], total: int | None) -> dict:
    comparison = _compare(source["values"], period, periods)
    postings = comparison["current"]
    return {
        "id": source["id"],
        "name": source["name"],
        "source_id": source["source_id"],
        "source_row": source["source_row"],
        "postings": postings,
        "market_share_percent": (
            round(postings / total * 100, 1)
            if postings is not None and total not in (None, 0)
            else None
        ),
        "previous_postings": comparison["previous"],
        "year_ago_postings": comparison["year_ago"],
        "qoq_change_percent": comparison["qoq"],
        "yoy_change_percent": comparison["yoy"],
    }


def _employment_metric(current: dict, previous: dict | None, year_ago: dict | None) -> dict:
    output = {key: current[key] for key in QES_METRICS}
    for metric in QES_METRICS:
        output[metric] = round(float(output[metric]), 3)
    for change_key, current_key in (("qoq_change_percent", "previous"), ("yoy_change_percent", "year_ago")):
        base_record = previous if current_key == "previous" else year_ago
        base = base_record.get("jobs") if base_record else None
        current_jobs = current.get("jobs")
        output[change_key] = None if base in (None, 0) else round((current_jobs - base) / base * 100, 1)
    return output


def build_market_radar_data(period: str | None = None) -> MarketRadarData:
    source = load_market_data()
    periods = source["periods"]
    selected = period or source["data_as_of"]
    if selected not in periods:
        raise MarketRadarError(f"No published JMI data is available for {selected}.")
    # Validate malformed values separately from well-formed but unavailable periods.
    _period_order(selected)

    total_comparison = _compare(source["jmi"]["total_job_offerings"], selected, periods)
    occupation_groups = sorted(
        (_jmi_signal(item, selected, periods, total_comparison["current"]) for item in source["jmi"]["occupation_groups"]),
        key=lambda item: (item["postings"] is None, -(item["postings"] or 0), item["name"].casefold()),
    )
    industries = sorted(
        (_jmi_signal(item, selected, periods, total_comparison["current"]) for item in source["jmi"]["industries"]),
        key=lambda item: (item["postings"] is None, -(item["postings"] or 0), item["name"].casefold()),
    )

    employment_series = source["employment_by_period"]
    current_employment = employment_series.get(selected)
    if current_employment is None:
        raise RuntimeError(f"The QES workbook has no employment statistics for {selected}.")
    year, quarter = _period_order(selected)
    position = periods.index(selected)
    previous_period = periods[position - 1] if position > 0 else None
    previous_employment = employment_series.get(previous_period) if previous_period else None
    year_ago_period = f"{year - 1:04d}-Q{quarter}"
    year_ago_employment = employment_series.get(year_ago_period)
    previous_sectors = {item["id"]: item for item in (previous_employment or {}).get("sectors", [])}
    year_ago_sectors = {item["id"]: item for item in (year_ago_employment or {}).get("sectors", [])}
    employment_sectors = []
    for item in current_employment["sectors"]:
        metric = _employment_metric(
            item,
            previous_sectors.get(item["id"]),
            year_ago_sectors.get(item["id"]),
        )
        employment_sectors.append({
            "id": item["id"],
            "name": item["name"],
            **metric,
            "skill_levels": [
                {key: level[key] for key in ("name", *QES_METRICS)}
                for level in item["skill_levels"]
            ],
        })
    employment_sectors.sort(key=lambda item: (-item["jobs"], item["name"].casefold()))
    employment_totals = _employment_metric(
        current_employment["totals"],
        (previous_employment or {}).get("totals"),
        (year_ago_employment or {}).get("totals"),
    )

    return MarketRadarData.model_validate({
        "snapshot_id": source["snapshot_id"],
        "region": source["region"],
        "data_as_of": source["data_as_of"],
        "period": selected,
        "periods": periods,
        "total_job_offerings": total_comparison["current"],
        "total_qoq_change_percent": total_comparison["qoq"],
        "total_yoy_change_percent": total_comparison["yoy"],
        "occupation_groups": occupation_groups,
        "industries": industries,
        "matching_readiness": {
            "candidate_skills_source": "confirmed_profile.skills",
            "position_granularity": "major_occupation_group",
            "named_positions_available": False,
            "named_skill_requirements_available": False,
            "evidence_based_matching_ready": False,
            "reason": (
                "The JMI summary provides major occupation groups and ad counts, not named job titles or required named skills. "
                "Use user-confirmed, normalized profile skills after a title-level position source with skill evidence is added."
            ),
        },
        "employment_totals": employment_totals,
        "employment_sectors": employment_sectors,
        "sources": source["sources"],
        "terms_url": source["terms_url"],
        "attribution": source["attribution"],
        "notes": source["notes"],
    })


def is_market_radar_enabled() -> bool:
    """Keep the unreviewed local prototype out of public deployments by default."""
    return os.getenv("DOSM_MARKET_RADAR_ENABLED", "0").strip() == "1"
