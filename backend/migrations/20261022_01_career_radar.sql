-- Career Radar structured retrieval schema for PostgreSQL / Neon.
-- This migration stores catalogue and reviewed trend evidence only. It does
-- not contain profiles, CV text, API keys, embeddings, or vector columns.

CREATE SCHEMA IF NOT EXISTS futureproof;

CREATE TABLE IF NOT EXISTS futureproof.career_roles (
    role_id TEXT PRIMARY KEY CHECK (role_id ~ '^role_[A-Za-z0-9_]+$'),
    field_id TEXT NOT NULL CHECK (field_id ~ '^field_[A-Za-z0-9_]+$'),
    name TEXT NOT NULL,
    summary TEXT NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    interests TEXT[] NOT NULL DEFAULT '{}',
    sdg_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    catalogue_version TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS futureproof.skills (
    skill_id TEXT PRIMARY KEY CHECK (skill_id ~ '^skill_[A-Za-z0-9_]+$'),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'ai_technical','human_centric','industry','general_technical'
    )),
    aliases TEXT[] NOT NULL DEFAULT '{}',
    catalogue_version TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS futureproof.role_skills (
    role_id TEXT NOT NULL REFERENCES futureproof.career_roles(role_id),
    skill_id TEXT NOT NULL REFERENCES futureproof.skills(skill_id),
    target_level SMALLINT NOT NULL CHECK (target_level BETWEEN 0 AND 5),
    importance TEXT NOT NULL CHECK (importance IN ('high','medium','low')),
    PRIMARY KEY (role_id, skill_id)
);

CREATE TABLE IF NOT EXISTS futureproof.evidence (
    evidence_id TEXT PRIMARY KEY CHECK (evidence_id ~ '^ev_[A-Za-z0-9_]+$'),
    title TEXT NOT NULL,
    source_url TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'job_posting','dataset','research','ai_capability'
    )),
    published_or_collected_at DATE NOT NULL,
    retrieved_at TIMESTAMPTZ NOT NULL,
    region TEXT,
    limitations TEXT,
    approval_reviewed_by TEXT,
    approval_reviewed_at TIMESTAMPTZ,
    CHECK ((approval_reviewed_by IS NULL) = (approval_reviewed_at IS NULL))
);

CREATE TABLE IF NOT EXISTS futureproof.trend_snapshots (
    snapshot_id TEXT PRIMARY KEY CHECK (snapshot_id ~ '^snap_[A-Za-z0-9_]+$'),
    region TEXT NOT NULL,
    window_start DATE NOT NULL,
    window_end DATE NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL,
    method_version TEXT NOT NULL,
    data_label TEXT NOT NULL CHECK (data_label IN ('synthetic_demo','public_open')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft','reviewed','active','retired'
    )),
    assumption_basis TEXT NOT NULL,
    uncertainty TEXT NOT NULL,
    activated_at TIMESTAMPTZ,
    CHECK (window_start <= window_end),
    CHECK (window_end <= collected_at::date),
    CHECK ((status = 'active') = (activated_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_trend_snapshot_per_region
    ON futureproof.trend_snapshots(region)
    WHERE status = 'active';

CREATE TABLE IF NOT EXISTS futureproof.snapshot_evidence (
    snapshot_id TEXT NOT NULL REFERENCES futureproof.trend_snapshots(snapshot_id),
    evidence_id TEXT NOT NULL REFERENCES futureproof.evidence(evidence_id),
    PRIMARY KEY (snapshot_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS futureproof.role_trend_signals (
    snapshot_id TEXT NOT NULL REFERENCES futureproof.trend_snapshots(snapshot_id),
    role_id TEXT NOT NULL REFERENCES futureproof.career_roles(role_id),
    trend_score NUMERIC(5,2) CHECK (trend_score BETWEEN 0 AND 100),
    signal_label TEXT NOT NULL CHECK (signal_label IN (
        'current_snapshot','insufficient_evidence','rising','stable','emerging','declining'
    )),
    observed_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    score_basis TEXT NOT NULL,
    PRIMARY KEY (snapshot_id, role_id)
);

CREATE TABLE IF NOT EXISTS futureproof.role_signal_evidence (
    snapshot_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    evidence_id TEXT NOT NULL,
    PRIMARY KEY (snapshot_id, role_id, evidence_id),
    FOREIGN KEY (snapshot_id, role_id)
        REFERENCES futureproof.role_trend_signals(snapshot_id, role_id),
    FOREIGN KEY (snapshot_id, evidence_id)
        REFERENCES futureproof.snapshot_evidence(snapshot_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS futureproof.skill_trend_signals (
    snapshot_id TEXT NOT NULL REFERENCES futureproof.trend_snapshots(snapshot_id),
    skill_id TEXT NOT NULL REFERENCES futureproof.skills(skill_id),
    trend_score NUMERIC(5,2) CHECK (trend_score BETWEEN 0 AND 100),
    signal_label TEXT NOT NULL CHECK (signal_label IN (
        'current_snapshot','insufficient_evidence','rising','stable','emerging','declining'
    )),
    observed_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    score_basis TEXT NOT NULL,
    PRIMARY KEY (snapshot_id, skill_id)
);

CREATE TABLE IF NOT EXISTS futureproof.skill_signal_evidence (
    snapshot_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    evidence_id TEXT NOT NULL,
    PRIMARY KEY (snapshot_id, skill_id, evidence_id),
    FOREIGN KEY (snapshot_id, skill_id)
        REFERENCES futureproof.skill_trend_signals(snapshot_id, skill_id),
    FOREIGN KEY (snapshot_id, evidence_id)
        REFERENCES futureproof.snapshot_evidence(snapshot_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS futureproof.scenario_assumptions (
    snapshot_id TEXT NOT NULL,
    scenario TEXT NOT NULL CHECK (scenario IN ('moderate','fast')),
    role_id TEXT NOT NULL,
    multiplier NUMERIC(5,4) NOT NULL CHECK (multiplier BETWEEN 0.5 AND 1.5),
    PRIMARY KEY (snapshot_id, scenario, role_id),
    FOREIGN KEY (snapshot_id, role_id)
        REFERENCES futureproof.role_trend_signals(snapshot_id, role_id)
);

CREATE INDEX IF NOT EXISTS career_roles_field_idx
    ON futureproof.career_roles(field_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS role_skills_skill_idx
    ON futureproof.role_skills(skill_id);
CREATE INDEX IF NOT EXISTS role_trend_snapshot_score_idx
    ON futureproof.role_trend_signals(snapshot_id, trend_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS skill_trend_snapshot_score_idx
    ON futureproof.skill_trend_signals(snapshot_id, trend_score DESC NULLS LAST);
