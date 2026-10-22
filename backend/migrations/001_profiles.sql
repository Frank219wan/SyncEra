CREATE TABLE IF NOT EXISTS profiles (
    profile_id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL CHECK (revision >= 0),
    body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
