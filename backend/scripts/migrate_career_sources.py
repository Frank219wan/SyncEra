#!/usr/bin/env python3
"""Apply the two reviewed career-source migrations to the approved Neon Preview.

Default mode only names the SQL files. Applying requires the same control-plane,
URL, connection and TLS checks as the importer. Existing partial source schema
is deliberately refused for manual PR #20/#21 reconciliation.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.career_import_target import (
    PreviewTargetError, verify_connected_preview, verify_preview_target,
)


MIGRATIONS = (
    Path(__file__).resolve().parents[1] / "migrations/20261022_01_career_radar.sql",
    Path(__file__).resolve().parents[1] / "migrations/20261023_03_career_sources_quarters.sql",
)
BASE_TABLES = (
    "career_roles", "skills", "role_skills", "evidence", "trend_snapshots",
    "snapshot_evidence", "role_trend_signals", "role_signal_evidence",
    "skill_trend_signals", "skill_signal_evidence", "scenario_assumptions",
)
SOURCE_TABLES = (
    "source_documents", "masco_occupations", "dosm_demand_quarters",
    "scenario_reference_anchors", "role_skill_assertions", "career_skill_quarter_versions",
)


def apply_migrations(database_url: str) -> list[str]:
    verify_preview_target(database_url)
    from psycopg import connect

    try:
        connection = connect(database_url, connect_timeout=10, sslrootcert="system")
    except Exception:
        raise PreviewTargetError("Verified Preview database connection failed") from None
    with connection:
        verify_connected_preview(connection)
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", (0x534B494C4C4F4759,))
            cursor.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema='futureproof' AND table_type='BASE TABLE'"
            )
            existing = {row[0] for row in cursor.fetchall()}
            base = set(BASE_TABLES)
            source = set(SOURCE_TABLES)
            if existing & base and not base <= existing:
                raise PreviewTargetError("Partial base career schema needs manual migration review")
            if existing & source:
                raise PreviewTargetError("Existing source schema needs manual migration review")
            if base <= existing:
                cursor.execute(
                    "SELECT table_name,column_name FROM information_schema.columns "
                    "WHERE table_schema='futureproof' AND table_name IN "
                    "('career_roles','skills','role_skills')"
                )
                columns = set(cursor.fetchall())
                required = {
                    ("career_roles", name) for name in (
                        "role_id", "field_id", "name", "summary", "aliases",
                        "interests", "sdg_links", "tasks", "catalogue_version", "is_active",
                    )
                } | {("skills", name) for name in (
                    "skill_id", "name", "category", "aliases", "catalogue_version", "is_active",
                )} | {("role_skills", name) for name in (
                    "role_id", "skill_id", "target_level", "importance",
                )}
                if not required <= columns:
                    raise PreviewTargetError("Base career schema is incompatible with this migration")
            applied = []
            for index, path in enumerate(MIGRATIONS):
                if index == 0 and base <= existing:
                    continue
                cursor.execute(path.read_text(encoding="utf-8"))
                applied.append(path.name)
    return applied


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply-preview", action="store_true")
    args = parser.parse_args()
    if not args.apply_preview:
        print("written=false; migrations=" + ",".join(path.name for path in MIGRATIONS))
        return
    if os.getenv("CAREER_IMPORT_TARGET") != "preview":
        parser.error("CAREER_IMPORT_TARGET=preview is required")
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        parser.error("DATABASE_URL is required")
    try:
        applied = apply_migrations(database_url)
    except PreviewTargetError as exc:
        parser.error(str(exc))
    print("applied=" + ",".join(applied))


if __name__ == "__main__":
    main()
