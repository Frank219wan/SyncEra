CREATE TABLE IF NOT EXISTS public.career_analysis_calls (
    request_hash text PRIMARY KEY,
    profile_id text NOT NULL,
    state text NOT NULL CHECK (state IN ('claimed', 'completed')),
    result jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS career_analysis_calls_profile_time
    ON public.career_analysis_calls (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS career_analysis_calls_time
    ON public.career_analysis_calls (created_at DESC);
