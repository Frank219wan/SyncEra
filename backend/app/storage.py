import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
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


class PostgresProfileStore:
    """Persistent profile repository; migrate the schema before serving requests."""

    def __init__(self, database_url: str):
        if not database_url or not database_url.startswith(('postgresql://', 'postgres://')):
            raise RuntimeError('DATABASE_URL must be a PostgreSQL connection URL')
        if os.getenv('VERCEL'):
            sslmode = parse_qs(urlsplit(database_url).query).get('sslmode', [])
            if sslmode not in (['require'], ['verify-ca'], ['verify-full']):
                raise RuntimeError('Vercel PostgreSQL DATABASE_URL must require TLS (sslmode=require or stronger)')
        from psycopg_pool import ConnectionPool
        self.pool = ConnectionPool(conninfo=database_url, min_size=0, max_size=3,
                                   timeout=5, max_idle=60, open=True)
        try:
            with self.pool.connection() as db:
                db.execute('SELECT profile_id FROM profiles LIMIT 0')
        except Exception:
            self.pool.close()
            raise RuntimeError('PostgreSQL profiles schema is unavailable; run migrate_postgres.py') from None

    def save_new(self, profile: Profile):
        with self.pool.connection() as db:
            db.execute('INSERT INTO profiles (profile_id, revision, body) VALUES (%s,%s,%s::jsonb)',
                       (profile.profile_id, profile.revision, profile.model_dump_json()))

    def get(self, profile_id: str) -> Profile | None:
        with self.pool.connection() as db:
            row = db.execute('SELECT body FROM profiles WHERE profile_id=%s', (profile_id,)).fetchone()
        return Profile.model_validate(row[0]) if row else None

    def update(self, profile: Profile, expected_revision: int) -> bool:
        if profile.revision != expected_revision + 1:
            raise ValueError('Profile revision must increment by exactly one')
        with self.pool.connection() as db:
            cursor = db.execute(
                'UPDATE profiles SET body=%s::jsonb, revision=%s, updated_at=now() '
                'WHERE profile_id=%s AND revision=%s',
                (profile.model_dump_json(), profile.revision, profile.profile_id, expected_revision))
            return cursor.rowcount == 1


def create_profile_store():
    mode = os.getenv('PROFILE_STORE', 'sqlite')
    if mode == 'postgres':
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise RuntimeError('DATABASE_URL is required when PROFILE_STORE=postgres; SQLite fallback is disabled')
        return PostgresProfileStore(database_url)
    if mode == 'sqlite':
        return ProfileStore()
    raise RuntimeError('PROFILE_STORE must be sqlite or postgres')
