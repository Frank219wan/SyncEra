"""Apply the idempotent PostgreSQL schema to DATABASE_URL. No data import."""
import os
from pathlib import Path

import psycopg

MIGRATIONS = (
    '001_profiles.sql',
    '002_career_analysis.sql',
    '20261023_04_organization_mvp.sql',
)


def main():
    url = os.environ.get('DATABASE_URL', '')
    if not url.startswith(('postgresql://', 'postgres://')):
        raise SystemExit('DATABASE_URL must be a PostgreSQL connection URL')
    migrations = Path(__file__).resolve().parents[1] / 'migrations'
    with psycopg.connect(url, connect_timeout=5) as db:
        for name in MIGRATIONS:
            db.execute((migrations / name).read_text())
    print('PostgreSQL profile, career analysis, and organization schemas ready')


if __name__ == '__main__':
    main()
