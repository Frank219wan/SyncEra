"""Offline storage selection / Preview fail-closed checks (no live credentials)."""
import pytest
from app.storage import ProfileStore, create_profile_store


def test_preview_requires_postgres(monkeypatch, tmp_path):
    monkeypatch.setenv("VERCEL_ENV", "preview")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "unexpected.sqlite"))
    with pytest.raises(RuntimeError, match="DATABASE_URL is required"):
        create_profile_store()
    assert not (tmp_path / "unexpected.sqlite").exists()


def test_local_sqlite_remains_available(monkeypatch, tmp_path):
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("REQUIRE_POSTGRES", raising=False)
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "local.sqlite"))
    assert isinstance(create_profile_store(), ProfileStore)


def test_invalid_db_url_rejected(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///tmp/profiles.sqlite")
    with pytest.raises(RuntimeError, match="PostgreSQL"):
        create_profile_store()
