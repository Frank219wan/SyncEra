import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from .models import Profile

class ProfileStore:
    def __init__(self, path: str | None = None):
        self.path = path or os.getenv('DATABASE_PATH',str(Path(__file__).resolve().parents[1]/'data'/'profiles.sqlite'))
        Path(self.path).parent.mkdir(parents=True,exist_ok=True)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS profiles (profile_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL)')

    @contextmanager
    def connect(self):
        db=sqlite3.connect(self.path,timeout=5)
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def save_new(self, profile: Profile):
        with self.connect() as db:
            db.execute('INSERT INTO profiles VALUES (?,?,?)',(profile.profile_id,profile.revision,profile.model_dump_json()))

    def get(self, profile_id: str) -> Profile | None:
        with self.connect() as db:
            row=db.execute('SELECT body FROM profiles WHERE profile_id=?',(profile_id,)).fetchone()
        return Profile.model_validate_json(row[0]) if row else None

    def update(self, profile: Profile, expected_revision: int) -> bool:
        with self.connect() as db:
            cur=db.execute('UPDATE profiles SET body=?,revision=? WHERE profile_id=? AND revision=?',(profile.model_dump_json(),profile.revision,profile.profile_id,expected_revision))
            return cur.rowcount == 1


def create_profile_store():
    """Select durable storage explicitly; Preview can never use local SQLite."""
    url = os.getenv("DATABASE_URL", "").strip()
    vercel_env = os.getenv("VERCEL_ENV", "").lower()
    require_postgres = vercel_env == "preview" or os.getenv("REQUIRE_POSTGRES") == "1"
    if url:
        if not url.startswith(("postgresql://", "postgres://")):
            raise RuntimeError("DATABASE_URL must be a PostgreSQL URL")
        from .postgres_storage import PostgresProfileStore
        return PostgresProfileStore(url)
    if require_postgres:
        raise RuntimeError("PostgreSQL DATABASE_URL is required for Preview; SQLite fallback is disabled")
    return ProfileStore()
