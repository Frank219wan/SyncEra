"""The live PostgreSQL test gate must fail before any write on an unsafe URL."""

from contextlib import contextmanager
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import pytest

from scripts import preview_test_db as safety
from scripts.migrate_postgres import PREVIEW_DATABASE, PREVIEW_ENDPOINT


VALID_URL = f'postgresql://owner:fictional@{PREVIEW_ENDPOINT}/{PREVIEW_DATABASE}?sslmode=require'


class Cursor:
    def __init__(self, rows):
        self.rows = rows

    def fetchall(self):
        return self.rows

    def fetchone(self):
        return self.rows[0]


class ReadOnlyDb:
    def __init__(self, tables):
        self.tables = tables
        self.statements = []

    def execute(self, sql, _params=None):
        self.statements.append(sql)
        return Cursor([(name,) for name in self.tables])


def test_live_test_gate_requires_existing_schema_and_verify_full(monkeypatch, tmp_path):
    ca = tmp_path / 'ca.pem'
    ca.write_text('fictional certificate')
    monkeypatch.setenv('PGSSLROOTCERT', str(ca))
    db = ReadOnlyDb(safety.REQUIRED_TABLES)

    @contextmanager
    def verified(_url, *, read_only):
        assert read_only is True
        yield db, False

    monkeypatch.setattr(safety, 'verified_preview_connection', verified)
    safe = safety.checked_test_url(VALID_URL)
    query = parse_qs(urlsplit(safe).query)
    assert query['sslmode'] == ['verify-full']
    assert query['sslrootcert'] == [str(ca)]
    assert db.statements and all(sql.startswith('SELECT') for sql in db.statements)


def test_live_test_gate_rejects_missing_schema_without_writing(monkeypatch, tmp_path):
    ca = tmp_path / 'ca.pem'
    ca.write_text('fictional certificate')
    monkeypatch.setenv('PGSSLROOTCERT', str(ca))
    db = ReadOnlyDb(['profiles'])

    @contextmanager
    def verified(_url, *, read_only):
        assert read_only is True
        yield db, False

    monkeypatch.setattr(safety, 'verified_preview_connection', verified)
    with pytest.raises(RuntimeError, match='schema is incomplete'):
        safety.checked_test_url(VALID_URL)
    assert all(sql.startswith('SELECT') for sql in db.statements)


@pytest.mark.parametrize('url', [
    'postgresql://owner:fictional@production.invalid/syncera_preview',
    f'postgresql://owner:fictional@{PREVIEW_ENDPOINT}/production',
])
def test_live_test_gate_rejects_wrong_target_before_connect(monkeypatch, url):
    monkeypatch.setattr(safety, 'verified_preview_connection',
                        lambda *_args, **_kwargs: pytest.fail('must not connect'))
    with pytest.raises(SystemExit, match='reviewed direct Neon Preview endpoint'):
        safety.checked_test_url(url)


def test_each_test_pool_connection_rechecks_tls_and_database():
    class Db:
        def __init__(self, ssl, database):
            self.pgconn = SimpleNamespace(ssl_in_use=ssl)
            self.database = database

        def execute(self, sql):
            assert sql == 'SELECT current_database()'
            return Cursor([(self.database,)])

        def rollback(self):
            pass

    safety.check_test_connection(Db(True, PREVIEW_DATABASE))
    with pytest.raises(RuntimeError, match='TLS'):
        safety.check_test_connection(Db(False, PREVIEW_DATABASE))
    with pytest.raises(RuntimeError, match='unreviewed database'):
        safety.check_test_connection(Db(True, 'production'))
