# Career Recommendations Preview contract fix

Base: `integration/career-radar-dosm-pr15` at `dd5bce4`. This change uses only fictional profiles, a local SQLite store, and `futureproof_ai.futureproof_adapter`; no paid AI, Neon, Vercel deployment, or secret was used.

## Root cause and exact failed rule

The Individual `Analyzing` page passes the confirmed profile and Trends snapshot to `api.recommendDetailed()`. The Backend `POST /api/v1/recommendations` returns HTTP 200 with matching `profile_id`, `ai_scenario`, `meta.snapshot_id`, scoring, order, and provenance. Its route sets `response_model_exclude_none=True`; `SkillGap.current_level` is nullable and defaults to `None`, so FastAPI omits that field for an unknown skill level.

The frontend `validateRecommendationPayload()` required `gap.current_level === null` or a valid integer. For an omitted field it saw `undefined` and threw `Recommendation skill gap is invalid.`; `api.recommendDetailed()` wrapped that error as `INVALID_RECOMMENDATIONS`. The subsequent mapping also needed to preserve the omitted value as `null` rather than leave an `undefined` UI level.

Local pre-fix evidence: the deterministic synthetic Backend returned HTTP 200, 2 ranked recommendations, `synthetic_demo` provenance, `tech-v1` model version, and a matching snapshot. All 5 unknown skill gaps omitted `current_level`. Passing the complete response envelope to the real frontend validator failed at the skill-gap rule. The new cross-stack assertion failed on that same rule before the fix and passed afterward.

## Minimal compatibility change

- Accept only an omitted value, explicit `null`, or a valid lower-than-target integer for `current_level`. Other malformed values, including a string, remain rejected.
- Map an omitted or null current level to `null` in the UI. Profile/snapshot identity, provenance, ranking, score arithmetic, evidence IDs, and skill-gap checks remain unchanged.
- Validate the complete Backend recommendation response with metadata in cross-stack CI for both Moderate and Fast. The synthetic fixture must include at least one omitted unknown level, which must map to `null`.

## Verification

- Frontend `corepack pnpm test`: 64 passed.
- Frontend `corepack pnpm run build`: passed.
- Frontend `VITE_API_MODE=real corepack pnpm run build`: passed.
- Backend `python -m pytest tests -q`: 123 passed, 2 skipped.
- Full local `tests/cross-stack.test.ts` against the deterministic Backend and temporary SQLite: 2 passed, including fictional PDF/DOCX upload, profile confirmation, and recommendation.
- The local npm registry was unreachable during install. The lockfile was identical to an existing tested worktree, so its local dependencies were copied; pnpm dependency verification was set to `warn` for the two commands above. No dependency or lockfile was changed.

## Backend Preview compatibility and release order

The Backend source at both `dd5bce4` and the older `integration/postgres-preview-backend` commit `eb4fee9` has nullable `SkillGap.current_level` plus `response_model_exclude_none=True`. This specific fix therefore requires a new **Frontend** Preview build, not a Backend code change. The actual live Backend Preview deployment SHA was not available locally, so compatibility with every other live response field remains unverified.

After review, merge this Draft PR into Integration. Keep both `git.deploymentEnabled=false` settings. Manually verify the protected Backend Preview's deployment SHA and contract first. If it lacks the expected `profile_id`, scenario, ranked recommendations, score breakdown, and `meta` provenance fields, deploy a reviewed compatible Backend Preview from `dd5bce4` or later before the Frontend. Otherwise retain the existing protected Backend Preview and manually deploy only the Frontend Preview from the merged Integration SHA. Then, with fictional data, verify `/api/v1/health`, Normalize → Confirm → Trends → Moderate/Fast Recommendations → Skill Gap, including a missing current level mapped to unknown. Confirm anonymous access remains blocked and do not touch Production or Neon records.

If another live mismatch remains, collect only the HTTP status, request ID, expected versus returned profile/snapshot IDs, scenario, `meta` label/mock/model version, and per-row field presence and types for rank, score breakdown, evidence IDs, and skill gaps. Redact profile content, CV text, free-text reasons, secrets, and full response bodies.
