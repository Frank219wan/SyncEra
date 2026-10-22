"""Apply the idempotent PostgreSQL schema to DATABASE_URL. No data import."""
import os
from pathlib import Path

import psycopg


def main():
    url = os.environ.get('DATABASE_URL', '')
    if not url.startswith(('postgresql://', 'postgres://')):
        raise SystemExit('DATABASE_URL must be a PostgreSQL connection URL')
    sql = (Path(__file__).resolve().parents[1] / 'migrations' / '001_profiles.sql').read_text()
    with psycopg.connect(url) as db:
        db.execute(sql)
    print('PostgreSQL profiles schema ready')


if __name__ == '__main__':
    main()
