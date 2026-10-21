import json
import os
import sqlite3
from pathlib import Path
from .models import Profile

class ProfileStore:
    def __init__(self, path: str | None = None):
        self.path = path or os.getenv('DATABASE_PATH',str(Path(__file__).resolve().parents[1]/'data'/'profiles.sqlite'))
        Path(self.path).parent.mkdir(parents=True,exist_ok=True)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS profiles (profile_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL)')

    def connect(self):
        return sqlite3.connect(self.path,timeout=5)

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
