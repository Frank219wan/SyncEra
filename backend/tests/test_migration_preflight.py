import pytest

from scripts import migrate_postgres as migration


VALID_URL = (
    f'postgresql://preview_owner:fictional@{migration.PREVIEW_ENDPOINT}/'
    f'{migration.PREVIEW_DATABASE}?sslmode=require'
)


@pytest.mark.parametrize('url', [
    'postgresql://owner:fictional@production.example/syncera_preview?sslmode=require',
    f'postgresql://owner:fictional@{migration.PREVIEW_ENDPOINT}/production?sslmode=require',
    f'postgresql://owner:fictional@{migration.PREVIEW_ENDPOINT.replace(".c-2", "-pooler.c-2")}/syncera_preview?sslmode=require',
    VALID_URL + '&host=production.example',
    VALID_URL.replace('sslmode=require', 'sslmode=disable'),
])
def test_migration_rejects_unreviewed_or_insecure_targets(url):
    with pytest.raises(SystemExit, match='reviewed direct Neon Preview endpoint') as error:
        migration.validate_preview_target(url)
    assert 'fictional' not in str(error.value)


def test_preflight_uses_verified_tls_and_only_reads(monkeypatch, capsys):
    statements = []

    class FakeCursor:
        def __init__(self, row):
            self.row = row

        def fetchone(self):
            return self.row

        def fetchall(self):
            return []

    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            pass

        def execute(self, sql, _params=None):
            statements.append(sql)
            if 'pg_stat_ssl' in sql:
                return FakeCursor((migration.PREVIEW_DATABASE, True))
            if 'schema_migrations' in sql:
                return FakeCursor((False,))
            return FakeCursor(None)

    def connect(url, **options):
        assert url == VALID_URL
        assert options['sslmode'] == 'verify-full'
        return FakeConnection()

    monkeypatch.setattr(migration.psycopg, 'connect', connect)
    monkeypatch.setenv('DATABASE_URL', VALID_URL)
    migration.main(['--preflight'])
    output = capsys.readouterr().out
    assert migration.PREVIEW_PROJECT_ID in output
    assert migration.PREVIEW_BRANCH_ID in output
    assert 'fictional' not in output
    assert statements and all(statement.lstrip().upper().startswith('SELECT') for statement in statements)


def test_preflight_rejects_non_tls_connection(monkeypatch):
    class Cursor:
        def fetchone(self):
            return (migration.PREVIEW_DATABASE, False)

    class Connection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            pass

        def execute(self, _sql):
            return Cursor()

    monkeypatch.setattr(migration.psycopg, 'connect', lambda *_args, **_kwargs: Connection())
    with pytest.raises(SystemExit, match='identity or TLS'):
        migration.inspect_preview(VALID_URL)
