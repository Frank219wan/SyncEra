-- Additive, Preview-first source store. Run after 20261022_01_career_radar.sql.
-- It coexists with PR #20's MASCO metadata migration when that PR is merged.
-- Raw DOSM group observations must never be copied onto child occupation roles.

CREATE TABLE IF NOT EXISTS futureproof.source_documents (
    source_id TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('dosm', 'emasco')),
    source_url TEXT NOT NULL CHECK (source_url LIKE 'https://%'),
    source_version TEXT NOT NULL,
    published_at DATE,
    collected_at TIMESTAMPTZ NOT NULL,
    extracted_content_sha256 TEXT NOT NULL CHECK (extracted_content_sha256 ~ '^[0-9a-f]{64}$'),
    method_version TEXT NOT NULL,
    UNIQUE (provider, source_url, extracted_content_sha256)
);

ALTER TABLE futureproof.career_roles ADD COLUMN IF NOT EXISTS masco_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS career_roles_masco_unique
    ON futureproof.career_roles(masco_code) WHERE masco_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS futureproof.masco_occupations (
    masco_code TEXT PRIMARY KEY CHECK (masco_code ~ '^[0-9]{4}(-[0-9]{2})?$'),
    parent_unit_group_code TEXT CHECK (parent_unit_group_code ~ '^[0-9]{4}$'),
    role_id TEXT UNIQUE REFERENCES futureproof.career_roles(role_id),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    tasks JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(tasks) = 'array'),
    official_skill_text JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(official_skill_text) = 'array'),
    source_id TEXT NOT NULL REFERENCES futureproof.source_documents(source_id),
    source_url TEXT NOT NULL CHECK (source_url LIKE 'https://%'),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (
        (masco_code ~ '^[0-9]{4}$' AND parent_unit_group_code IS NULL AND role_id IS NULL)
        OR (masco_code ~ '^[0-9]{4}-[0-9]{2}$'
            AND parent_unit_group_code = substring(masco_code FROM 1 FOR 4)
            AND role_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS futureproof.dosm_demand_quarters (
    unit_group_code TEXT NOT NULL CHECK (unit_group_code ~ '^[0-9]{4}$'),
    period TEXT NOT NULL CHECK (period ~ '^[0-9]{4}-Q[1-4]$'),
    region TEXT NOT NULL,
    job_offerings INTEGER NOT NULL CHECK (job_offerings >= 0),
    total_job_offerings INTEGER NOT NULL CHECK (total_job_offerings > 0),
    CHECK (job_offerings <= total_job_offerings),
    measurement_series_id TEXT NOT NULL,
    quality_status TEXT NOT NULL CHECK (quality_status IN ('clear','reviewed_conflict','conflicted','method_pending')),
    scenario_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (NOT scenario_eligible OR quality_status IN ('clear','reviewed_conflict')),
    source_id TEXT NOT NULL REFERENCES futureproof.source_documents(source_id),
    source_row TEXT,
    limitation TEXT NOT NULL,
    PRIMARY KEY (unit_group_code, period, region, source_id)
);
CREATE INDEX IF NOT EXISTS dosm_demand_quarters_period_idx
    ON futureproof.dosm_demand_quarters(region, period DESC, unit_group_code);

-- Product scenario labels select real historical observations; neither label
-- is an official DOSM AI-speed metric. An anchor pair is immutable per version.
CREATE TABLE IF NOT EXISTS futureproof.scenario_reference_anchors (
    catalogue_version TEXT NOT NULL,
    unit_group_code TEXT NOT NULL CHECK (unit_group_code ~ '^[0-9]{4}$'),
    region TEXT NOT NULL,
    moderate_period TEXT NOT NULL,
    moderate_source_id TEXT NOT NULL,
    fast_period TEXT NOT NULL,
    fast_source_id TEXT NOT NULL,
    rationale TEXT NOT NULL,
    limitation TEXT NOT NULL,
    PRIMARY KEY (catalogue_version, unit_group_code, region),
    FOREIGN KEY (unit_group_code, moderate_period, region, moderate_source_id)
        REFERENCES futureproof.dosm_demand_quarters(unit_group_code, period, region, source_id),
    FOREIGN KEY (unit_group_code, fast_period, region, fast_source_id)
        REFERENCES futureproof.dosm_demand_quarters(unit_group_code, period, region, source_id),
    CHECK (moderate_period < fast_period)
);

-- Separate generated skill assertions from official source excerpts. An
-- assertion can be stored without claiming that eMASCO/DOSM stated it.
CREATE TABLE IF NOT EXISTS futureproof.role_skill_assertions (
    assertion_id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL REFERENCES futureproof.career_roles(role_id),
    skill_id TEXT NOT NULL REFERENCES futureproof.skills(skill_id),
    origin TEXT NOT NULL CHECK (origin IN ('emasco_page', 'ai_generated')),
    source_id TEXT REFERENCES futureproof.source_documents(source_id),
    source_excerpt TEXT,
    model_version TEXT,
    prompt_version TEXT,
    generated_at TIMESTAMPTZ,
    target_level SMALLINT CHECK (target_level BETWEEN 0 AND 5),
    target_level_origin TEXT CHECK (target_level_origin IN ('human_set', 'ai_generated')),
    importance TEXT CHECK (importance IN ('high', 'medium', 'low')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'retired')),
    CHECK (status <> 'active' OR (target_level IS NOT NULL
        AND target_level_origin IS NOT NULL AND importance IS NOT NULL)),
    CHECK (
        (origin = 'emasco_page' AND source_id IS NOT NULL AND source_excerpt IS NOT NULL
            AND model_version IS NULL AND prompt_version IS NULL AND generated_at IS NULL)
        OR (origin = 'ai_generated' AND model_version IS NOT NULL
            AND prompt_version IS NOT NULL AND generated_at IS NOT NULL
            AND source_id IS NULL AND source_excerpt IS NULL)
    )
);
CREATE UNIQUE INDEX IF NOT EXISTS role_skill_assertions_one_active_idx
    ON futureproof.role_skill_assertions(role_id, skill_id) WHERE status = 'active';

-- Optional historical role-skill snapshots. A newly collected eMASCO page may
-- not be backdated to a DOSM quarter without a period-specific source.
CREATE TABLE IF NOT EXISTS futureproof.career_skill_quarter_versions (
    period TEXT NOT NULL CHECK (period ~ '^[0-9]{4}-Q[1-4]$'),
    role_id TEXT NOT NULL REFERENCES futureproof.career_roles(role_id),
    skill_id TEXT NOT NULL REFERENCES futureproof.skills(skill_id),
    assertion_id TEXT NOT NULL REFERENCES futureproof.role_skill_assertions(assertion_id),
    period_source_id TEXT NOT NULL REFERENCES futureproof.source_documents(source_id),
    validity_note TEXT NOT NULL,
    PRIMARY KEY (period, role_id, skill_id)
);
