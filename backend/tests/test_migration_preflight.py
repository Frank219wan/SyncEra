from types import SimpleNamespace

import psycopg
import pytest

from scripts import migrate_postgres as migration


VALID_URL = (
    f'postgresql://preview_owner:fictional@{migration.PREVIEW_ENDPOINT}/'
    f'{migration.PREVIEW_DATABASE}?sslmode=require'
)


@pytest.fixture
def trusted_ca(tmp_path, monkeypatch):
    ca = tmp_path / 'trusted-ca.pem'
    ca.write_text('fictional test certificate')
    monkeypatch.setenv('PGSSLROOTCERT', str(ca))
    return ca


class FakeCursor:
    def __init__(self, row):
        self.row = row

    def fetchone(self):
        return self.row

    def fetchall(self):
        return []


class FakeConnection:
    def __init__(self, *, client_ssl=True, server_ssl=False, database=None, read_only='on'):
        self.pgconn = SimpleNamespace(ssl_in_use=client_ssl)
        self.server_ssl = server_ssl
        self.database = database or migration.PREVIEW_DATABASE
        self.read_only = read_only
        self.statements = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        pass

    def execute(self, sql, _params=None):
        self.statements.append(sql)
        if 'current_database()' in sql:
            return FakeCursor((self.database, self.read_only, self.server_ssl))
        if 'schema_migrations' in sql:
            return FakeCursor((False,))
        return FakeCursor(None)


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


def test_preflight_verifies_client_tls_and_only_reads_even_if_server_reports_false(
    monkeypatch, trusted_ca, capsys,
):
    db = FakeConnection(client_ssl=True, server_ssl=False)

    def connect(url, **options):
        assert url == VALID_URL
        assert options['sslmode'] == 'verify-full'
        assert options['sslrootcert'] == str(trusted_ca)
        assert options['host'] == migration.PREVIEW_ENDPOINT
        assert options['dbname'] == migration.PREVIEW_DATABASE
        assert options['options'] == '-c default_transaction_read_only=on'
        return db

    monkeypatch.setattr(migration.psycopg, 'connect', connect)
    monkeypatch.setenv('DATABASE_URL', VALID_URL)
    migration.main(['--preflight'])
    output = capsys.readouterr().out
    assert 'client_ssl_in_use=True' in output
    assert 'server_pg_stat_ssl=False' in output
    assert 'recheck independently before write' in output
    assert migration.PREVIEW_PROJECT_ID in output
    assert migration.PREVIEW_BRANCH_ID in output
    assert 'fictional' not in output
    assert db.statements and all(sql.lstrip().upper().startswith('SELECT') for sql in db.statements)


def test_preflight_rejects_disabled_client_tls(monkeypatch, trusted_ca):
    db = FakeConnection(client_ssl=False, server_ssl=True)
    monkeypatch.setattr(migration.psycopg, 'connect', lambda *_args, **_kwargs: db)
    with pytest.raises(SystemExit, match='Client TLS is not active'):
        migration.inspect_preview(VALID_URL)
    assert db.statements == []


@pytest.mark.parametrize('override', ['PGHOSTADDR', 'PGSERVICE'])
def test_preflight_rejects_libpq_routing_overrides(monkeypatch, trusted_ca, override):
    monkeypatch.setenv(override, 'unreviewed')
    monkeypatch.setattr(migration.psycopg, 'connect',
                        lambda *_args, **_kwargs: pytest.fail('connection must not be attempted'))
    with pytest.raises(SystemExit, match='routing overrides'):
        migration.inspect_preview(VALID_URL)


@pytest.mark.parametrize('configured', ['missing', 'relative', 'empty', 'directory'])
def test_preflight_rejects_missing_or_invalid_ca(monkeypatch, tmp_path, configured):
    monkeypatch.delenv('PGSSLROOTCERT', raising=False)
    if configured == 'relative':
        monkeypatch.setenv('PGSSLROOTCERT', 'relative-ca.pem')
    elif configured == 'empty':
        empty = tmp_path / 'empty-ca.pem'
        empty.touch()
        monkeypatch.setenv('PGSSLROOTCERT', str(empty))
    elif configured == 'directory':
        monkeypatch.setenv('PGSSLROOTCERT', str(tmp_path))
    monkeypatch.setattr(migration.psycopg, 'connect',
                        lambda *_args, **_kwargs: pytest.fail('connection must not be attempted'))
    with pytest.raises(SystemExit, match='PGSSLROOTCERT'):
        migration.inspect_preview(VALID_URL)


@pytest.mark.parametrize('failure', [
    'certificate verify failed',
    'server certificate hostname mismatch',
    'unable to get local issuer certificate',
])
def test_certificate_or_hostname_failure_is_redacted(monkeypatch, trusted_ca, failure):
    def connect(*_args, **_kwargs):
        raise psycopg.OperationalError(f'{failure}: fictional-secret')

    monkeypatch.setattr(migration.psycopg, 'connect', connect)
    with pytest.raises(SystemExit, match='Preview database connection or query failed') as error:
        migration.inspect_preview(VALID_URL)
    assert 'fictional-secret' not in str(error.value)


def test_connected_database_must_match_preview(monkeypatch, trusted_ca):
    db = FakeConnection(database='production')
    monkeypatch.setattr(migration.psycopg, 'connect', lambda *_args, **_kwargs: db)
    with pytest.raises(SystemExit, match='not the reviewed Preview database'):
        migration.inspect_preview(VALID_URL)


def test_preflight_requires_read_only_connection(monkeypatch, trusted_ca):
    db = FakeConnection(read_only='off')
    monkeypatch.setattr(migration.psycopg, 'connect', lambda *_args, **_kwargs: db)
    with pytest.raises(SystemExit, match='not read only'):
        migration.inspect_preview(VALID_URL)


def test_apply_path_rechecks_its_own_connection_before_any_migration(monkeypatch, trusted_ca):
    connections = [FakeConnection(client_ssl=True), FakeConnection(client_ssl=False)]
    options_used = []

    def connect(_url, **options):
        options_used.append(options)
        return connections.pop(0)

    monkeypatch.setattr(migration.psycopg, 'connect', connect)
    monkeypatch.setattr(migration, 'apply_migrations',
                        lambda _db: pytest.fail('migration must not start on unverified connection'))
    monkeypatch.setenv('DATABASE_URL', VALID_URL)
    with pytest.raises(SystemExit, match='Client TLS is not active'):
        migration.main(['--apply-preview'])
    assert len(options_used) == 2
    assert all(options['sslmode'] == 'verify-full' for options in options_used)
    assert all(options['sslrootcert'] == str(trusted_ca) for options in options_used)
    assert all(options['host'] == migration.PREVIEW_ENDPOINT for options in options_used)
    assert all(options['dbname'] == migration.PREVIEW_DATABASE for options in options_used)
    assert 'options' not in options_used[1]


def test_apply_path_rejects_wrong_database_on_its_own_connection(monkeypatch, trusted_ca):
    connections = [FakeConnection(), FakeConnection(database='production')]
    monkeypatch.setattr(migration.psycopg, 'connect', lambda *_args, **_kwargs: connections.pop(0))
    monkeypatch.setattr(migration, 'apply_migrations',
                        lambda _db: pytest.fail('migration must not start on wrong database'))
    monkeypatch.setenv('DATABASE_URL', VALID_URL)
    with pytest.raises(SystemExit, match='not the reviewed Preview database'):
        migration.main(['--apply-preview'])
