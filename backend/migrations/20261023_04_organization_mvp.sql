-- Organization MVP persistence for protected, synthetic Preview use only.
-- Server-side access only: never expose DATABASE_URL or these tables to Vite.

CREATE TABLE IF NOT EXISTS public.organization_workspaces (
    workspace_id TEXT PRIMARY KEY CHECK (workspace_id ~ '^org_[A-Za-z0-9_]+$'),
    mode TEXT NOT NULL CHECK (mode IN ('hr', 'career_centre')),
    region TEXT NOT NULL CHECK (region ~ '^[A-Z]{2}$'),
    label TEXT NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 160),
    synthetic_input BOOLEAN NOT NULL DEFAULT TRUE CHECK (synthetic_input),
    reviewed_by_user BOOLEAN NOT NULL DEFAULT FALSE,
    revision INTEGER NOT NULL CHECK (revision >= 1),
    schema_version TEXT NOT NULL,
    body JSONB NOT NULL CHECK (jsonb_typeof(body) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_workspaces_mode_updated_idx
    ON public.organization_workspaces (mode, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.organization_analyses (
    analysis_id TEXT PRIMARY KEY CHECK (analysis_id ~ '^organalysis_[A-Za-z0-9_]+$'),
    workspace_id TEXT NOT NULL REFERENCES public.organization_workspaces(workspace_id),
    input_revision INTEGER NOT NULL CHECK (input_revision >= 1),
    snapshot_id TEXT NOT NULL CHECK (snapshot_id ~ '^snap_[A-Za-z0-9_]+$'),
    scenario TEXT NOT NULL CHECK (scenario IN ('moderate', 'fast')),
    scoring_policy TEXT NOT NULL,
    method_version TEXT NOT NULL,
    data_label TEXT NOT NULL CHECK (data_label IN ('synthetic_demo', 'mixed_demo', 'public_open')),
    is_mock BOOLEAN NOT NULL,
    result JSONB NOT NULL CHECK (jsonb_typeof(result) = 'object'),
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(warnings) = 'array'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((data_label = 'public_open') = (NOT is_mock)),
    UNIQUE (workspace_id, input_revision, snapshot_id, scenario, scoring_policy, method_version)
);

CREATE INDEX IF NOT EXISTS organization_analyses_workspace_created_idx
    ON public.organization_analyses (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.organization_plan_versions (
    plan_id TEXT NOT NULL CHECK (plan_id ~ '^orgplan_[A-Za-z0-9_]+$'),
    version INTEGER NOT NULL CHECK (version >= 1),
    workspace_id TEXT NOT NULL REFERENCES public.organization_workspaces(workspace_id),
    analysis_id TEXT NOT NULL REFERENCES public.organization_analyses(analysis_id),
    plan_kind TEXT NOT NULL CHECK (plan_kind IN (
        'student_action', 'institutional_feedback', 'enterprise_training'
    )),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'confirmed', 'adopted', 'retired'
    )),
    body JSONB NOT NULL CHECK (jsonb_typeof(body) = 'object'),
    approved_by_role TEXT CHECK (approved_by_role IN ('student_adviser', 'educator', 'hr')),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (plan_id, version),
    CHECK ((approved_by_role IS NULL) = (approved_at IS NULL)),
    CHECK ((status = 'draft') = (approved_at IS NULL))
);

CREATE INDEX IF NOT EXISTS organization_plan_versions_workspace_idx
    ON public.organization_plan_versions (workspace_id, created_at DESC);

-- Durable reservation for optional paid Organization explanations. Store only
-- hashes and schema-valid results; never store provider keys, prompts or raw CV,
-- student, employee or counsellor-note text in this ledger.
CREATE TABLE IF NOT EXISTS public.organization_analysis_calls (
    request_hash TEXT PRIMARY KEY CHECK (request_hash ~ '^[0-9a-f]{64}$'),
    workspace_id TEXT NOT NULL REFERENCES public.organization_workspaces(workspace_id),
    analysis_kind TEXT NOT NULL CHECK (analysis_kind IN (
        'student_explanation', 'student_action_plan',
        'institutional_feedback', 'hr_explanation', 'enterprise_training'
    )),
    model_version TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('claimed', 'completed')),
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CHECK ((state = 'completed') = (result IS NOT NULL AND completed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS organization_analysis_calls_workspace_time_idx
    ON public.organization_analysis_calls (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS organization_analysis_calls_time_idx
    ON public.organization_analysis_calls (created_at DESC);
