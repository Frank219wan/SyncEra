"""No network or real database is used by these Preview write-guard tests."""

import copy
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest

from app import career_import_target as target
from app import career_source_import as importer
from test_career_source_import import payload


HOST = "ep-summer-waterfall-aoweosnc.c-2.ap-southeast-1.aws.neon.tech"
URL = f"postgresql://owner:synthetic@{HOST}/syncera_preview?sslmode=verify-full"


@pytest.fixture
def metadata(monkeypatch):
    monkeypatch.setenv("NEON_API_KEY", "synthetic-test-token")
    documents = {
        "": {"project": {"id": target.PROJECT_ID, "name": target.PROJECT_NAME}},
        f"/branches/{target.BRANCH_ID}": {"branch": {
            "id": target.BRANCH_ID, "project_id": target.PROJECT_ID, "name": target.BRANCH_NAME,
            "primary": True,
        }},
        f"/branches/{target.BRANCH_ID}/endpoints": {"endpoints": [{
            "host": HOST, "project_id": target.PROJECT_ID, "branch_id": target.BRANCH_ID,
            "type": "read_write", "disabled": False,
        }]},
        f"/branches/{target.BRANCH_ID}/databases": {"databases": [{
            "name": target.DATABASE_NAME, "branch_id": target.BRANCH_ID,
        }]},
    }
    monkeypatch.setattr(target, "_metadata", lambda path, key: documents[path])
    return documents


def test_reviewed_preview_identity_accepts_primary_branch(metadata):
    assert target.verify_preview_target(URL) == HOST


@pytest.mark.parametrize("url", [
    "postgresql://owner:synthetic@ep-production.aws.neon.tech/syncera_preview?sslmode=verify-full",
    URL.replace(HOST, "ep-other.c-2.ap-southeast-1.aws.neon.tech"),
    URL.replace("syncera_preview", "production"),
    URL.replace("sslmode=verify-full", "sslmode=require"),
    URL.replace("sslmode=verify-full", "sslmode=disable"),
    URL.replace("sslmode=verify-full", "sslmode=verify-full&hostaddr=127.0.0.1"),
    URL.replace(HOST, HOST.replace("waterfall", "waterfall-pooler")),
    "postgresql://owner:synthetic@localhost/syncera_preview?sslmode=verify-full",
    "",
])
def test_misrouted_or_ambiguous_url_is_rejected(metadata, url):
    with pytest.raises(target.PreviewTargetError):
        target.verify_preview_target(url)


@pytest.mark.parametrize("path,field,value", [
    ("", "project", {"id": "production-id", "name": target.PROJECT_NAME}),
    (f"/branches/{target.BRANCH_ID}", "branch", {
        "id": "br-production", "project_id": target.PROJECT_ID, "name": "production",
    }),
    (f"/branches/{target.BRANCH_ID}/endpoints", "endpoints", []),
    (f"/branches/{target.BRANCH_ID}/databases", "databases", []),
])
def test_wrong_control_plane_identity_is_rejected(metadata, path, field, value):
    metadata[path][field] = value
    with pytest.raises(target.PreviewTargetError):
        target.verify_preview_target(URL)


def test_missing_metadata_or_forged_preview_flag_fails_closed(metadata, monkeypatch):
    monkeypatch.setenv("CAREER_IMPORT_TARGET", "preview")
    monkeypatch.delenv("NEON_API_KEY")
    with pytest.raises(target.PreviewTargetError, match="control-plane"):
        target.verify_preview_target(URL)
    monkeypatch.setenv("NEON_API_KEY", "synthetic-test-token")
    monkeypatch.setattr(target, "_metadata", lambda path, key: (_ for _ in ()).throw(
        target.PreviewTargetError("Neon metadata unavailable")))
    with pytest.raises(target.PreviewTargetError):
        target.verify_preview_target(URL)


def test_lower_level_apply_cannot_bypass_guard(monkeypatch):
    import psycopg
    monkeypatch.delenv("NEON_API_KEY", raising=False)
    monkeypatch.setenv("CAREER_IMPORT_TARGET", "preview")
    monkeypatch.setattr(psycopg, "connect", lambda *args, **kwargs: pytest.fail("connected"))
    manifest = importer.CareerImportManifest.model_validate(payload())
    with pytest.raises(target.PreviewTargetError):
        importer.apply_manifest(manifest, URL)


def test_verified_target_connection_failure_is_sanitized(metadata, monkeypatch):
    import psycopg
    monkeypatch.setattr(psycopg, "connect", lambda *args, **kwargs: (_ for _ in ()).throw(
        RuntimeError("postgresql://owner:secret@private.invalid/production")))
    manifest = importer.CareerImportManifest.model_validate(payload())
    with pytest.raises(target.PreviewTargetError) as error:
        importer.apply_manifest(manifest, URL)
    assert "secret" not in str(error.value)


def test_migration_entrypoint_cannot_bypass_guard(monkeypatch):
    import psycopg
    from scripts.migrate_career_sources import apply_migrations
    monkeypatch.delenv("NEON_API_KEY", raising=False)
    monkeypatch.setattr(psycopg, "connect", lambda *args, **kwargs: pytest.fail("connected"))
    with pytest.raises(target.PreviewTargetError):
        apply_migrations(URL)


class FakeDatabase:
    def __init__(self):
        self.rows = {}
        self.locks = {}
        self.mutex = threading.Lock()
        self.commits = 0

    def connect(self, *args, **kwargs):
        return FakeConnection(self)


class FakeConnection:
    def __init__(self, db):
        self.db = db
        self.pending = {}
        self.held = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        if exc_type is None:
            self.db.rows.update(self.pending)
            self.db.commits += 1
        for lock in reversed(self.held):
            lock.release()

    def cursor(self):
        return FakeCursor(self)


class FakeCursor:
    def __init__(self, connection):
        self.connection = connection
        self.answer = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def execute(self, sql, params=None):
        db = self.connection.db
        if "current_database()" in sql:
            self.answer = (target.DATABASE_NAME, True, "TLSv1.3")
        elif "pg_advisory_xact_lock" in sql:
            with db.mutex:
                lock = db.locks.setdefault(params[0], threading.Lock())
            lock.acquire()
            self.connection.held.append(lock)
        elif "SELECT DISTINCT job_offerings,total_job_offerings,measurement_series_id" in sql:
            key = tuple(params)
            value = self.connection.pending.get(key, db.rows.get(key))
            self.answer = [] if value is None else [value]
        elif "INSERT INTO futureproof.dosm_demand_quarters" in sql:
            key = (params[0], params[1], params[2])
            self.connection.pending[key] = (params[3], params[4], params[5])
        elif sql.lstrip().startswith("SELECT"):
            self.answer = None

    def fetchone(self):
        return self.answer

    def fetchall(self):
        return self.answer


@pytest.fixture
def fake_database(metadata, monkeypatch):
    import psycopg
    db = FakeDatabase()
    monkeypatch.setattr(psycopg, "connect", db.connect)
    return db


def changed_manifest(*, offerings=None, total=None, series=None):
    data = copy.deepcopy(payload())
    row = data["demand_quarters"][-1]
    old_source = row["source_id"]
    new_source = old_source + "_test"
    next(source for source in data["sources"] if source["source_id"] == old_source)["source_id"] = new_source
    row["source_id"] = new_source
    if offerings is not None:
        row["job_offerings"] = offerings
    if total is not None:
        row["total_job_offerings"] = total
    if series is not None:
        row["measurement_series_id"] = series
    return importer.CareerImportManifest.model_validate(data)


@pytest.mark.parametrize("change", [
    {"total": 555510}, {"series": "other-series"}, {"offerings": 19900},
])
def test_conflict_triple_rejects_and_rolls_back(fake_database, change):
    original = importer.CareerImportManifest.model_validate(payload())
    importer.apply_manifest(original, URL)
    before = dict(fake_database.rows)
    with pytest.raises(ValueError, match="conflicting DOSM"):
        importer.apply_manifest(changed_manifest(**change), URL)
    assert fake_database.rows == before
    assert fake_database.commits == 1


def test_exact_triple_and_second_identical_import_are_idempotent(fake_database):
    original = importer.CareerImportManifest.model_validate(payload())
    importer.apply_manifest(original, URL)
    before = dict(fake_database.rows)
    importer.apply_manifest(changed_manifest(), URL)
    importer.apply_manifest(original, URL)
    assert fake_database.rows == before


def test_concurrent_conflicting_quarter_imports_serialize(fake_database):
    first = importer.CareerImportManifest.model_validate(payload())
    second = changed_manifest(offerings=19900)
    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(lambda manifest: _attempt(manifest), [first, second]))
    assert outcomes.count("accepted") == 1
    assert outcomes.count("conflict") == 1
    assert len(fake_database.rows) == 3


def _attempt(manifest):
    try:
        importer.apply_manifest(manifest, URL)
        return "accepted"
    except ValueError:
        return "conflict"


def test_connected_database_and_tls_are_checked():
    class WrongConnection:
        def cursor(self):
            class Cursor:
                def __enter__(self): return self
                def __exit__(self, *args): pass
                def execute(self, *args): pass
                def fetchone(self): return ("production", True, "TLSv1.3")
            return Cursor()
    with pytest.raises(target.PreviewTargetError):
        target.verify_connected_preview(WrongConnection())

    class PlainConnection(WrongConnection):
        def cursor(self):
            cursor = super().cursor()
            cursor.fetchone = lambda: (target.DATABASE_NAME, False, None)
            return cursor
    with pytest.raises(target.PreviewTargetError):
        target.verify_connected_preview(PlainConnection())
