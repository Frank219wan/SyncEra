"""PostgreSQL shared reservation for paid analysis; never reissues a claimed call."""
from __future__ import annotations

import hashlib


class PostgresCareerAnalysisLedger:
    def __init__(self, pool):
        self.pool = pool
        with pool.connection() as db:
            db.execute('SELECT request_hash FROM public.career_analysis_calls LIMIT 0')

    def claim(self, request_hash: str, profile_id: str):
        with self.pool.connection() as db:
            # Serialize admission for one profile across serverless instances.
            db.execute('SELECT pg_advisory_xact_lock(%s)', (705831644209847512,))
            lock_key = int.from_bytes(hashlib.sha256(profile_id.encode()).digest()[:8], 'big', signed=True)
            db.execute('SELECT pg_advisory_xact_lock(%s)', (lock_key,))
            row = db.execute(
                'SELECT state, result FROM public.career_analysis_calls WHERE request_hash=%s',
                (request_hash,),
            ).fetchone()
            if row:
                return ('cached', row[1]) if row[0] == 'completed' else ('in_progress', None)
            daily = db.execute(
                "SELECT count(*) FROM public.career_analysis_calls WHERE profile_id=%s AND created_at > now() - interval '1 day'",
                (profile_id,),
            ).fetchone()[0]
            recent = db.execute(
                "SELECT count(*) FROM public.career_analysis_calls WHERE created_at > now() - interval '1 minute'",
            ).fetchone()[0]
            if daily >= 3 or recent >= 10:
                return 'rate_limited', None
            cursor = db.execute(
                "INSERT INTO public.career_analysis_calls (request_hash, profile_id, state) "
                "VALUES (%s, %s, 'claimed') ON CONFLICT DO NOTHING",
                (request_hash, profile_id),
            )
            return ('claimed', None) if cursor.rowcount == 1 else ('in_progress', None)

    def complete(self, request_hash: str, result: dict):
        from psycopg.types.json import Jsonb
        with self.pool.connection() as db:
            cursor = db.execute(
                "UPDATE public.career_analysis_calls SET state='completed', result=%s, completed_at=now() "
                "WHERE request_hash=%s AND state='claimed'",
                (Jsonb(result), request_hash),
            )
            if cursor.rowcount != 1:
                raise RuntimeError('Career analysis claim disappeared before completion')
