#!/usr/bin/env python3
"""Build SyncEra's compact local radar snapshot from DOSM's two Q2 2026 workbooks.

The script keeps JMI job-ad counts and QES employment measures separate. It reads
the original workbooks and writes a JSON asset consumed by the local API.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_EMPLOYMENT = Path.home() / "Downloads" / "Employment Statistics, Q2 2026.xlsx"
DEFAULT_JMI = Path.home() / "Downloads" / "Data JMI Q2 2026.xlsx"
DEFAULT_OUTPUT = ROOT / "backend" / "data" / "dosm_market_q2_2026.json"
LATEST_PERIOD = (2026, 2)
JMI_RELEASE = "https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026"
QES_RELEASE = "https://www.dosm.gov.my/portal-main/release-content/employment-statistics-Q22026"
TERMS_URL = "https://www.dosm.gov.my/portal-main/article/term-of-use"
QES_METRICS = ("jobs", "filled_jobs", "vacancies", "jobs_created")
SKILL_ORDER = ("Skilled", "Semi-skilled", "Low-skilled")


def period_tuple(value: str) -> tuple[int, int]:
    match = re.fullmatch(r"(\d{4})-Q([1-4])", value)
    if not match:
        raise ValueError(f"Invalid quarter key: {value}")
    return int(match.group(1)), int(match.group(2))


def quarter_key(year: Any, quarter: Any) -> str | None:
    if not isinstance(year, (int, float)) or not isinstance(quarter, (int, float)):
        return None
    year_i, quarter_i = int(year), int(quarter)
    if quarter_i not in (1, 2, 3, 4):
        return None
    return f"{year_i:04d}-Q{quarter_i}"


def numeric(value: Any, *, integer: bool = False) -> int | float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, str):
        text = value.strip().replace(",", "")
        if text in ("", "-", "–", "—"):
            return None
        value = text
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    if integer:
        return int(round(number))
    return round(number, 3)


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def read_jmi(sheet) -> tuple[list[str], dict[str, int], list[dict], list[dict]]:
    """Read quarter columns only; annual and monthly columns are deliberately omitted."""
    jmi_periods: list[str] = []
    quarter_columns: list[tuple[str, int]] = []
    year: int | None = None
    for column in range(11, 41):  # Q3 2019 through Q4 2026; Q3/Q4 2026 are blank.
        year_cell = sheet.cell(3, column).value
        if isinstance(year_cell, (int, float)):
            year = int(year_cell)
        quarter_cell = sheet.cell(4, column).value
        if year is None or not isinstance(quarter_cell, str) or not re.fullmatch(r"Q[1-4]", quarter_cell):
            continue
        period = f"{year:04d}-{quarter_cell}"
        if period_tuple(period) > LATEST_PERIOD:
            continue
        total = numeric(sheet.cell(5, column).value, integer=True)
        if total is not None:
            jmi_periods.append(period)
            quarter_columns.append((period, column))

    if not jmi_periods or jmi_periods[-1] != "2026-Q2":
        raise ValueError("The JMI workbook does not contain a complete 2026-Q2 quarter.")

    total_by_period = {
        period: numeric(sheet.cell(5, column).value, integer=True)
        for period, column in quarter_columns
    }

    def table(first_row: int, last_row: int, prefix: str) -> list[dict]:
        output = []
        for row_number in range(first_row, last_row + 1):
            label = sheet.cell(row_number, 2).value
            if not isinstance(label, str) or not label.strip() or label.strip().lower() in ("jumlah", "total"):
                continue
            values = {
                period: numeric(sheet.cell(row_number, column).value, integer=True)
                for period, column in quarter_columns
            }
            output.append({
                "id": f"{prefix}-{slug(label)}",
                "name": label.strip(),
                "source_id": "dosm-jmi-q2-2026",
                "source_row": row_number,
                "values": values,
            })
        return output

    total = int(total_by_period["2026-Q2"] or 0)
    occupation_total = numeric(sheet.cell(34, next(column for period, column in quarter_columns if period == "2026-Q2")).value, integer=True)
    industries = table(6, 27, "industry")
    occupations = table(35, 44, "occupation")
    if total != 555_509 or occupation_total != total:
        raise ValueError(f"Unexpected JMI Q2 2026 totals: industries={total}, occupations={occupation_total}.")
    for kind, records in (("industry", industries), ("occupation", occupations)):
        latest_sum = sum(record["values"].get("2026-Q2") or 0 for record in records)
        if latest_sum != total:
            raise ValueError(f"JMI {kind} categories sum to {latest_sum}, expected {total} in 2026-Q2.")
    return jmi_periods, total_by_period, occupations, industries


def read_qes(sheet) -> dict[str, dict]:
    rows = sheet.iter_rows(values_only=True)
    header = next(rows)
    indices = {str(name): index for index, name in enumerate(header) if name is not None}
    required = ("Year", "Quarter", "Skills", "Economic Activity", *(
        "Jobs ('000)", "Filled Jobs ('000)", "Vacancies ('000)", "Jobs Created ('000)"
    ))
    missing = [name for name in required if name not in indices]
    if missing:
        raise ValueError(f"QES_QUARTER is missing expected columns: {', '.join(missing)}")

    activity_index = indices["Economic Activity"]
    skill_index = indices["Skills"]
    period_rows: dict[str, dict[str, dict[str, dict[str, float]]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(lambda: {metric: 0.0 for metric in QES_METRICS}))
    )
    for row in rows:
        period = quarter_key(row[indices["Year"]], row[indices["Quarter"]])
        if period is None or period_tuple(period) > LATEST_PERIOD:
            continue
        activity = row[activity_index]
        skill = row[skill_index]
        if not isinstance(activity, str) or skill not in SKILL_ORDER:
            continue
        target = period_rows[period][activity][skill]
        for metric, source_column in zip(QES_METRICS, required[4:]):
            value = numeric(row[indices[source_column]])
            if value is not None:
                target[metric] += value

    output: dict[str, dict] = {}
    for period, activities in period_rows.items():
        sectors = []
        totals = {metric: 0.0 for metric in QES_METRICS}
        for activity, skill_rows in sorted(activities.items()):
            skill_levels = []
            sector_totals = {metric: 0.0 for metric in QES_METRICS}
            for skill in SKILL_ORDER:
                measures = skill_rows.get(skill, {metric: 0.0 for metric in QES_METRICS})
                measures = {metric: round(measures[metric], 3) for metric in QES_METRICS}
                for metric in QES_METRICS:
                    sector_totals[metric] += measures[metric]
                skill_levels.append({"name": skill, **measures})
            sector_totals = {metric: round(value, 3) for metric, value in sector_totals.items()}
            for metric in QES_METRICS:
                totals[metric] += sector_totals[metric]
            sectors.append({"id": f"employment-{slug(activity)}", "name": activity, **sector_totals, "skill_levels": skill_levels})
        totals = {metric: round(value, 3) for metric, value in totals.items()}
        if abs(totals["jobs"] - totals["filled_jobs"] - totals["vacancies"]) > 0.05:
            raise ValueError(f"QES jobs do not reconcile to filled jobs plus vacancies for {period}.")
        output[period] = {"totals": totals, "sectors": sectors}

    if "2026-Q2" not in output:
        raise ValueError("QES_QUARTER does not contain 2026-Q2 rows.")
    q2_total = output["2026-Q2"]["totals"]
    if abs(q2_total["jobs"] - 9249.57) > 0.01 or abs(q2_total["vacancies"] - 195.73) > 0.01:
        raise ValueError(f"Unexpected QES Q2 2026 totals: {q2_total}")
    return dict(sorted(output.items(), key=lambda pair: period_tuple(pair[0])))


def build(employment_path: Path, jmi_path: Path) -> dict:
    for path in (employment_path, jmi_path):
        if not path.is_file():
            raise FileNotFoundError(f"Workbook not found: {path}")

    jmi_book = load_workbook(jmi_path, data_only=True, read_only=True)
    qes_book = load_workbook(employment_path, data_only=True, read_only=True)
    try:
        if "e2-Summary Table BI" not in jmi_book.sheetnames:
            raise ValueError("JMI workbook is missing the e2-Summary Table BI sheet.")
        if "QES_QUARTER" not in qes_book.sheetnames:
            raise ValueError("Employment workbook is missing the QES_QUARTER sheet.")
        periods, total_by_period, occupations, industries = read_jmi(jmi_book["e2-Summary Table BI"])
        employment = read_qes(qes_book["QES_QUARTER"])
    finally:
        jmi_book.close()
        qes_book.close()

    return {
        "snapshot_id": "dosm-market-q2-2026",
        "region": "MY",
        "data_as_of": "2026-Q2",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "periods": periods,
        "jmi": {
            "total_job_offerings": total_by_period,
            "occupation_groups": occupations,
            "industries": industries,
        },
        "employment_by_period": employment,
        "sources": [
            {
                "id": "dosm-jmi-q2-2026",
                "title": "Big Data Analytics: Job Market Insights, Second Quarter 2026",
                "file": jmi_path.name,
                "published_on": "2026-08-18",
                "url": JMI_RELEASE,
                "measure": "Online job offerings advertised by major occupation group and economic activity.",
            },
            {
                "id": "dosm-employment-q2-2026",
                "title": "Employment Statistics, Second Quarter 2026",
                "file": employment_path.name,
                "published_on": "2026-08-13",
                "url": QES_RELEASE,
                "measure": "Jobs, filled jobs, vacancies and jobs created by economic activity and broad skill level; values are in thousands.",
            },
        ],
        "terms_url": TERMS_URL,
        "attribution": "Data source: Department of Statistics Malaysia. Derived and visualized by SyncEra; DOSM does not endorse this application or its analysis.",
        "notes": [
            "JMI values are online job advertisements, not confirmed hires or unique vacancies.",
            "QES values are in thousands and describe surveyed labour demand; its skill levels are broad occupational tiers, not named competencies.",
            "A dash or blank in the source is retained as unavailable data, not converted to zero.",
            "Quarter-over-quarter and year-over-year percentages are calculated by SyncEra from the published counts.",
            "Unclassified categories are retained when DOSM reports them.",
        ],
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--employment", type=Path, default=DEFAULT_EMPLOYMENT, help="Employment Statistics Q2 2026 workbook")
    parser.add_argument("--jmi", type=Path, default=DEFAULT_JMI, help="Data JMI Q2 2026 workbook")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output JSON path")
    args = parser.parse_args()
    payload = build(args.employment.expanduser(), args.jmi.expanduser())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    latest = payload["jmi"]["total_job_offerings"]["2026-Q2"]
    qes = payload["employment_by_period"]["2026-Q2"]["totals"]
    print(f"Wrote {args.output}")
    print(f"JMI: {len(payload['periods'])} quarters through 2026-Q2; {latest:,} online job offerings")
    print(f"Occupation groups: {len(payload['jmi']['occupation_groups'])}; industries: {len(payload['jmi']['industries'])}")
    print(f"QES: {qes['jobs']:.3f}k jobs, {qes['vacancies']:.3f}k vacancies, {qes['jobs_created']:.3f}k jobs created")


if __name__ == "__main__":
    main()
