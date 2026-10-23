"""Preflight or apply the Preview schema to the single reviewed Neon target.

The project, branch and direct endpoint below were independently checked in
Neon. Operators must repeat that control-plane check before an authorized write.
"""
import argparse
import os
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import psycopg

MIGRATIONS = (
    '001_profiles.sql',
    '002_career_analysis.sql',
    '20261023_04_organization_mvp.sql',
)
PREVIEW_PROJECT_ID = 'aged-surf-56749653'
PREVIEW_BRANCH_ID = 'br-falling-glade-aox9nfes'
PREVIEW_ENDPOINT = 'ep-summer-waterfall-aoweosnc.c-2.ap-southeast-1.aws.neon.tech'
PREVIEW_DATABASE = 'syncera_preview'
ORGANIZATION_TABLES = (
    'organization_workspaces', 'organization_analyses',
    'organization_plan_versions', 'organization_analysis_calls',
)


def validate_preview_target(url: str) -> None:
    """Reject other databases, pooled endpoints and libpq routing overrides."""
    try:
        parsed = urlsplit(url)
        options = parse_qs(parsed.query, keep_blank_values=True, strict_parsing=True)
        port = parsed.port
    except ValueError:
        raise SystemExit('Invalid Preview database target') from None
    if (parsed.scheme not in ('postgresql', 'postgres') or
            parsed.hostname != PREVIEW_ENDPOINT or
            parsed.path != f'/{PREVIEW_DATABASE}' or
            port not in (None, 5432) or not parsed.username or
            parsed.fragment or
            set(options) - {'sslmode', 'channel_binding', 'application_name'} or
            any(len(values) != 1 for values in options.values()) or
            options.get('sslmode', ['require'])[0] not in ('require', 'verify-full')):
        raise SystemExit('Database target is not the reviewed direct Neon Preview endpoint')


def inspect_preview(url: str) -> dict[str, object]:
    """Read only: verify connected database and TLS; inspect schema presence."""
    validate_preview_target(url)
    with psycopg.connect(url, connect_timeout=5, sslmode='verify-full') as db:
        database, tls = db.execute(
            'SELECT current_database(), ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()'
        ).fetchone()
        if database != PREVIEW_DATABASE or tls is not True:
            raise SystemExit('Connected database identity or TLS check failed')
        existing = db.execute(
            "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' "
            "AND tablename = ANY(%s)", (list(ORGANIZATION_TABLES),)
        ).fetchall()
        migration_history = db.execute(
            "SELECT to_regclass('public.schema_migrations') IS NOT NULL"
        ).fetchone()[0]
    return {
        'project_id': PREVIEW_PROJECT_ID,
        'branch_id': PREVIEW_BRANCH_ID,
        'endpoint': PREVIEW_ENDPOINT,
        'database': PREVIEW_DATABASE,
        'tls': 'verify-full',
        'organization_tables': sorted(row[0] for row in existing),
        'migration_history_table': bool(migration_history),
    }


def apply_migrations(db: psycopg.Connection) -> None:
    """Run idempotent schema files on an already selected connection."""
    migrations = Path(__file__).resolve().parents[1] / 'migrations'
    for name in MIGRATIONS:
        db.execute((migrations / name).read_text())


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--preflight', action='store_true', help='read-only target and schema check')
    action.add_argument('--apply-preview', action='store_true', help='apply after deployment-owner approval')
    args = parser.parse_args(argv)
    url = os.environ.get('DATABASE_URL', '')
    details = inspect_preview(url)
    print(f"Preview target checked: project={details['project_id']} "
          f"branch={details['branch_id']} endpoint={details['endpoint']} "
          f"database={details['database']} TLS={details['tls']}")
    print(f"Organization tables present: {details['organization_tables']}; "
          f"migration history table: {details['migration_history_table']}")
    if args.apply_preview:
        with psycopg.connect(url, connect_timeout=5, sslmode='verify-full') as db:
            apply_migrations(db)
        print('PostgreSQL profile, career analysis, and organization schemas ready')


if __name__ == '__main__':
    main()
