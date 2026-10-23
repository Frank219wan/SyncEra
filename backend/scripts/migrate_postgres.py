"""Preflight or apply the Preview schema to the single reviewed Neon target.

The project, branch and direct endpoint below were independently checked in
Neon. Operators must repeat that control-plane check before an authorized write.
"""
import argparse
import os
from contextlib import contextmanager
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


def trusted_ca_file() -> str:
    """Require an explicit, readable CA bundle; never fall back to sslmode=require."""
    configured = os.environ.get('PGSSLROOTCERT', '')
    path = Path(configured)
    try:
        valid = (bool(configured) and path.is_absolute() and not path.is_symlink()
                 and path.is_file() and path.stat().st_size > 0)
    except OSError:
        valid = False
    if not valid:
        raise SystemExit('PGSSLROOTCERT must name a readable absolute CA certificate file')
    return str(path)


@contextmanager
def verified_preview_connection(url: str, *, read_only: bool = False):
    """Verify the TLS state and identity of this connection before using it."""
    validate_preview_target(url)
    if os.environ.get('PGHOSTADDR') or os.environ.get('PGSERVICE'):
        raise SystemExit('libpq routing overrides are unavailable for Preview migration')
    ca_file = trusted_ca_file()
    options = {'connect_timeout': 5, 'sslmode': 'verify-full', 'sslrootcert': ca_file,
               'host': PREVIEW_ENDPOINT, 'dbname': PREVIEW_DATABASE, 'port': 5432}
    if read_only:
        options['options'] = '-c default_transaction_read_only=on'
    try:
        with psycopg.connect(url, **options) as db:
            try:
                client_ssl = db.pgconn.ssl_in_use
            except (AttributeError, psycopg.Error):
                raise SystemExit('Client TLS state is unavailable') from None
            if not client_ssl:
                raise SystemExit('Client TLS is not active')
            row = db.execute(
                'SELECT current_database(), current_setting(\'transaction_read_only\'), '
                '(SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid())'
            ).fetchone()
            if not row or row[0] != PREVIEW_DATABASE:
                raise SystemExit('Connected database is not the reviewed Preview database')
            if read_only and row[1] != 'on':
                raise SystemExit('Preview preflight connection is not read only')
            yield db, row[2]
    except psycopg.Error:
        # psycopg errors can contain connection parameters. Never print them.
        raise SystemExit('Preview database connection or query failed') from None


def inspect_preview(url: str) -> dict[str, object]:
    """Read only: verify client TLS and identity; inspect schema presence."""
    with verified_preview_connection(url, read_only=True) as (db, server_ssl):
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
        'client_ssl_in_use': True,
        'server_pg_stat_ssl': server_ssl,
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
    print(f"Preview target checked: endpoint={details['endpoint']} "
          f"database={details['database']} client_TLS={details['tls']} "
          f"client_ssl_in_use={details['client_ssl_in_use']} "
          f"server_pg_stat_ssl={details['server_pg_stat_ssl']}")
    print(f"Expected Neon control-plane identity (recheck independently before write): "
          f"project={details['project_id']} branch={details['branch_id']}")
    print(f"Organization tables present: {details['organization_tables']}; "
          f"migration history table: {details['migration_history_table']}")
    if args.apply_preview:
        # This is a second connection: never reuse the preflight connection's
        # TLS or database identity result as authorization for a write.
        with verified_preview_connection(url) as (db, _server_ssl):
            apply_migrations(db)
        print('PostgreSQL profile, career analysis, and organization schemas ready')


if __name__ == '__main__':
    main()
