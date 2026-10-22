import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from .models import Profile

logger = logging.getLogger(__name__)

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
                                   timeout=5, max_idle=60, kwargs={'connect_timeout': 5},
                                   check=ConnectionPool.check_connection, open=True)
        try:
            with self.pool.connection() as db:
                db.execute('SELECT profile_id FROM public.profiles LIMIT 0')
        except Exception:
            self.pool.close()
            raise RuntimeError('PostgreSQL connection or profiles schema is unavailable') from None

    def close(self):
        self.pool.close()

    def save_new(self, profile: Profile):
        import psycopg

        body = profile.model_dump_json()
        for attempt in range(2):
            try:
                with self.pool.connection() as db:
                    # A lost acknowledgement after COMMIT must not create a second row.
                    inserted = db.execute(
                        'INSERT INTO public.profiles (profile_id, revision, body) VALUES (%s,%s,%s::jsonb) '
                        'ON CONFLICT (profile_id) DO NOTHING',
                        (profile.profile_id, profile.revision, body))
                    if inserted.rowcount == 0:
                        existing = db.execute(
                            'SELECT revision, body FROM public.profiles WHERE profile_id=%s',
                            (profile.profile_id,)).fetchone()
                        if not existing or existing[0] != profile.revision or existing[1] != json.loads(body):
                            raise RuntimeError('Profile ID conflict')
                return
            except (psycopg.OperationalError, psycopg.InterfaceError) as exc:
                # Retry only a transport failure, once, with the same Profile ID and
                # serialized body. Never repeat profile extraction or other SQL errors.
                if attempt or exc.sqlstate is not None:
                    raise
                logger.warning('PostgreSQL profile insert connection retry; exception_type=%s',
                               type(exc).__name__)

    def get(self, profile_id: str) -> Profile | None:
        with self.pool.connection() as db:
            row = db.execute('SELECT body FROM public.profiles WHERE profile_id=%s', (profile_id,)).fetchone()
        return Profile.model_validate(row[0]) if row else None

    def update(self, profile: Profile, expected_revision: int) -> bool:
        if profile.revision != expected_revision + 1:
            raise ValueError('Profile revision must increment by exactly one')
        with self.pool.connection() as db:
            cursor = db.execute(
                'UPDATE public.profiles SET body=%s::jsonb, revision=%s, updated_at=now() '
                'WHERE profile_id=%s AND revision=%s',
                (profile.model_dump_json(), profile.revision, profile.profile_id, expected_revision))
            return cursor.rowcount == 1


def create_profile_store():
    mode = os.getenv('PROFILE_STORE', 'sqlite')
    if os.getenv('VERCEL_ENV') == 'preview' and mode != 'postgres':
        raise RuntimeError('Vercel Preview requires PROFILE_STORE=postgres; SQLite fallback is disabled')
    if mode == 'postgres':
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise RuntimeError('DATABASE_URL is required when PROFILE_STORE=postgres; SQLite fallback is disabled')
        return PostgresProfileStore(database_url)
    if mode == 'sqlite':
        return ProfileStore()
    raise RuntimeError('PROFILE_STORE must be sqlite or postgres')
