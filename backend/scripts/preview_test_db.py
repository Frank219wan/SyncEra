"""Fail-closed connection setup for synthetic tests on the reviewed Neon Preview."""

from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit

from scripts.migrate_postgres import (
    PREVIEW_DATABASE, verified_preview_connection, validate_preview_target,
    trusted_ca_file,
)


REQUIRED_TABLES = (
    'profiles', 'career_analysis_calls', 'organization_workspaces',
    'organization_analyses', 'organization_plan_versions',
    'organization_analysis_calls',
)


def checked_test_url(raw_url: str) -> str:
    """Require an existing schema and independently verified, read-only connection.

    The returned URL forces verify-full for every subsequent test pool connection.
    No migration or other write is performed here.
    """
    validate_preview_target(raw_url)
    ca_file = trusted_ca_file()
    with verified_preview_connection(raw_url, read_only=True) as (db, _server_ssl):
        rows = db.execute(
            "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' "
            "AND tablename = ANY(%s)", (list(REQUIRED_TABLES),)
        ).fetchall()
    missing = set(REQUIRED_TABLES) - {row[0] for row in rows}
    if missing:
        raise RuntimeError('Preview test schema is incomplete; run only the separately reviewed migration')
    parsed = urlsplit(raw_url)
    options = dict(parse_qsl(parsed.query, keep_blank_values=True))
    options.update(sslmode='verify-full', sslrootcert=ca_file, connect_timeout='5')
    # libpq URI options decode %20, but do not treat '+' as a space in paths.
    return urlunsplit(parsed._replace(query=urlencode(options, quote_via=quote)))


def check_test_connection(db) -> None:
    """Check a pooled connection before a synthetic test can write through it."""
    if not db.pgconn.ssl_in_use:
        raise RuntimeError('Preview test client TLS is not active')
    try:
        database = db.execute('SELECT current_database()').fetchone()[0]
    finally:
        db.rollback()
    if database != PREVIEW_DATABASE:
        raise RuntimeError('Preview test connected to an unreviewed database')
