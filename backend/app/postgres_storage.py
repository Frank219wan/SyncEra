"""Neon PostgreSQL-backed ProfileStore API. Each operation uses a short transaction.

The atomic UPDATE revision predicate is the CAS serialization point across
requests, workers and serverless instances.
"""
from __future__ import annotations
import os
import psycopg
from psycopg.types.json import Jsonb
from .models import Profile


class PostgresProfileStore:
    def __init__(self, database_url: str):
        if not database_url or not database_url.startswith(("postgresql://", "postgres://")):
            raise ValueError("A PostgreSQL DATABASE_URL is required")
        self.database_url = database_url
        # No schema creation at runtime: provision/migrate the Preview schema
        # separately. This prevents silent writes to the wrong environment.
        self.check_connection()

    def connect(self):
        return psycopg.connect(self.database_url, connect_timeout=5)

    def check_connection(self) -> None:
        with self.connect() as conn:
            conn.execute("SELECT 1 FROM public.profiles LIMIT 0")

    def save_new(self, profile: Profile) -> None:
        with self.connect() as conn:
            conn.execute(
                "INSERT INTO public.profiles (profile_id, revision, body) VALUES (%s, %s, %s)",
                (profile.profile_id, profile.revision, Jsonb(profile.model_dump(mode="json"))),
            )

    def get(self, profile_id: str) -> Profile | None:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT body FROM public.profiles WHERE profile_id = %s", (profile_id,)
            ).fetchone()
        return Profile.model_validate(row[0]) if row else None

    def update(self, profile: Profile, expected_revision: int) -> bool:
        with self.connect() as conn:
            cursor = conn.execute(
                "UPDATE public.profiles "
                "SET body = %s, revision = %s, updated_at = NOW() "
                "WHERE profile_id = %s AND revision = %s",
                (Jsonb(profile.model_dump(mode="json")), profile.revision,
                 profile.profile_id, expected_revision),
            )
            return cursor.rowcount == 1
