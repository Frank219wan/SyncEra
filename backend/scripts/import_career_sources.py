#!/usr/bin/env python3
"""Validate a career-market manifest; write only with explicit --apply-preview."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.career_source_import import (
    CareerImportManifest, apply_manifest, reference_windows,
    select_fixed_scenario, select_market_observation,
)
from app.career_import_target import PreviewTargetError


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--apply-preview", action="store_true",
                        help="Write atomically to the explicitly configured Preview PostgreSQL")
    args = parser.parse_args()
    manifest = CareerImportManifest.model_validate_json(args.manifest.read_text(encoding="utf-8"))
    summary = {
        "catalogue_version": manifest.catalogue_version,
        "sources": len(manifest.sources),
        "masco_occupations": len(manifest.occupations),
        "dosm_quarters": len(manifest.demand_quarters),
        "scenario_anchors": len(manifest.scenario_anchors),
        "skill_assertions": len(manifest.skill_assertions),
        "active_ai_generated_assertions": sum(
            row.origin == "ai_generated" and row.status == "active"
            for row in manifest.skill_assertions
        ),
        "historical_reference_windows": reference_windows(manifest),
    }
    summary["scenario_examples"] = [
        {
            "unit_group_code": window["unit_group_code"],
            "moderate": select_fixed_scenario(
                manifest, unit_group_code=window["unit_group_code"],
                region=window["region"], scenario="moderate",
            ) if manifest.scenario_anchors else select_market_observation(
                manifest, unit_group_code=window["unit_group_code"],
                region=window["region"], measurement_series_id=window["measurement_series_id"],
                speed_percent=0,
            ),
            "fast": select_fixed_scenario(
                manifest, unit_group_code=window["unit_group_code"],
                region=window["region"], scenario="fast",
            ) if manifest.scenario_anchors else select_market_observation(
                manifest, unit_group_code=window["unit_group_code"],
                region=window["region"], measurement_series_id=window["measurement_series_id"],
                speed_percent=100,
            ),
        }
        for window in summary["historical_reference_windows"]
    ]
    if args.apply_preview:
        if os.getenv("CAREER_IMPORT_TARGET") != "preview":
            parser.error("CAREER_IMPORT_TARGET=preview is required for database writes")
        url = os.getenv("DATABASE_URL", "")
        if not url:
            parser.error("DATABASE_URL is required for database writes")
        try:
            summary["written"] = apply_manifest(manifest, url)
        except PreviewTargetError as exc:
            parser.error(str(exc))
    else:
        summary["written"] = False
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
