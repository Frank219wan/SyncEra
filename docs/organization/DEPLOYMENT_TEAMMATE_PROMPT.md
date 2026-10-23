# Organization B2 Preview Deployment — Teammate Prompt

Copy the prompt below to the teammate responsible for Neon and Vercel. Replace only the bracketed values. Do not paste secrets into chat, GitHub, screenshots or logs.

---

## Prompt

You are the deployment owner for SyncEra / FutureProof AI. Please deploy and verify the Organization B2 Career Helping Centre flow from the GitHub PR whose head branch is:

```text
feature/organization-mvp
```

Repository:

```text
https://github.com/Frank219wan/SyncEra
```

This task is **Preview only**. Do not merge the PR, promote to Production, modify Production environment variables, enable paid AI, or enter real CV/student/employee data.

### 1. Verify the exact source

1. Record the PR number and exact head commit SHA.
2. Confirm the PR targets `main` and is based on the current `main` without unresolved conflicts.
3. Deploy that exact commit to separate protected Frontend and Backend Preview projects.
4. Do not deploy an older integration branch and do not treat an old green Preview as evidence for this commit.

Both repository-root and `backend/vercel.json` currently set `git.deploymentEnabled=false`. A Git push or PR is therefore not expected to create a Preview automatically. Use the team's approved manual Preview deployment/redeploy workflow for the exact PR commit, or request repository-owner approval before changing Git deployment settings. Do not enable Production auto-deployment.

### 2. Create an isolated Neon Preview database

Create or select an isolated Neon Preview branch/database. Do not use the Production database.

Use its pooled TLS connection string only as a server-side secret. It must use `sslmode=require` or stronger.

Before deployment, run the real PostgreSQL integration tests from `backend` with the isolated test URL supplied through `TEST_DATABASE_URL`:

```powershell
$env:TEST_DATABASE_URL = '<isolated Neon Preview pooled TLS URL>'
python -m pytest tests/test_postgres_integration.py tests/test_organization_postgres.py -q
```

Then apply the idempotent migrations using the official entry point:

```powershell
$env:DATABASE_URL = '<same isolated Neon Preview pooled TLS URL>'
python -m scripts.migrate_postgres
```

Confirm that these tables exist:

```text
profiles
career_analysis_calls
organization_workspaces
organization_analyses
organization_plan_versions
organization_analysis_calls
```

Do not print either database URL. Do not manually edit or drop Production tables.

### 3. Configure Backend Preview

Backend project Root Directory should remain `backend`. Verify the existing FastAPI deployment entry used by the working Backend project. Do not copy or fork the FastAPI business implementation; if the runtime requires an entry shim, it may only import and export the existing `app` from `app.main`.

Set these variables for the **specific PR branch Preview only**:

```text
PROFILE_STORE=postgres
DATABASE_URL=<Neon Preview pooled TLS secret>
ENABLE_ORGANIZATION_MVP=1
FRONTEND_ORIGINS=<exact Frontend Preview HTTPS origin>
AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter
ENABLE_LIVE_CAREER_RECOMMENDATION=0
```

Keep candidate DOSM/public-open activation disabled unless separately approved. B2 uses deterministic `organization-b2-v0.1`; it does not need MiniMax and must not be described as LLM scoring.

Deploy Backend Preview and verify:

- `/api/v1/health` returns 200 after authenticated/protected access;
- `/openapi.json` contains `POST /api/v1/organizations/{mode}/analyze`;
- startup does not fall back to SQLite;
- missing Organization schema or missing PostgreSQL configuration causes an explicit failure;
- Vercel logs contain no database URL, bypass secret or request body with personal data.

If the generated Backend alias does not match the explicit `feature-organization-mvp` allowlist in `server/proxy.ts`, report the exact hostname without query strings or secrets. Update the allowlist narrowly through a reviewed code change; do not accept arbitrary `*.vercel.app` hosts.

### 4. Configure Frontend Preview

Frontend project Root Directory should remain the repository root. Configure these variables for the same PR branch Preview only:

```text
VITE_API_MODE=real
BACKEND_PREVIEW_ORIGIN=<exact protected Backend Preview HTTPS origin>
BACKEND_PROTECTION_BYPASS_SECRET=<Backend automation bypass secret; server-only>
```

Never give the bypass secret a `VITE_` prefix. Remove or ignore obsolete `VITE_API_BASE_URL`; the browser should call relative `/api/v1/*` only.

Keep Vercel Authentication/Deployment Protection enabled on both Preview projects. Ensure the Frontend WAF/rate-limit rule covers `/api/v1/*`, with a stricter limit for POST requests. Do not create a public exception for the Organization API.

### 5. Run the fictional B2 acceptance flow

Use only the repository's fictional TVET sample or newly created obviously fictional records.

1. Open `/organization/tvet/students` in the protected Frontend Preview.
2. Confirm skill levels, interests, goal tags and work-style preferences.
3. Check the explicit fictional-record review box.
4. Run a Moderate analysis.
5. Confirm editable student records remain present after the response.
6. Verify career scores, six score components, strengths, Skill Gaps and three action-plan sections render from the API response.
7. Select at least two students and generate cohort insights.
8. Verify cohort gap counts, affected member IDs, workshops, tutoring priorities and curriculum supplements come from the server response.
9. Switch to Fast and rerun. Confirm the resolved snapshot/scenario changes and at least one score differs while recorded skills remain unchanged.
10. Submit an old `workspace_revision` and verify HTTP 409 `REVISION_CONFLICT`; the UI must retain the local draft and must not silently overwrite it.
11. Trigger a validation or network failure and confirm Real mode does not fall back to Demo recommendations.
12. Start a fresh request or Function instance and continue the workspace revision to demonstrate Neon persistence rather than process memory.

### 6. Security checks

- Anonymous requests to both protected Preview origins must be challenged before application access.
- `POST /api/v1/organizations/hr/analyze` must remain unavailable.
- `synthetic_input=false` must be rejected before forwarding or analysis.
- Unknown proxy routes, arbitrary backend origins and Production proxy execution must be rejected.
- No real student, CV, employee, counsellor-note or personally identifiable information may be uploaded.
- No API key, database URL or protection bypass value may appear in browser assets, Network payloads, Function logs, screenshots or PR comments.

### 7. Required evidence

Return a Markdown report containing:

```text
PR number
exact commit SHA
Frontend Preview URL
Backend Preview URL
Neon branch/database identifier (not the connection string)
migration result
PostgreSQL test result
frontend build/test result
backend pytest/pip-check result
health and OpenAPI result
Moderate response status and workspace revision
Fast response status and workspace revision
stale revision 409 evidence
fresh-instance persistence evidence
Deployment Protection/WAF verification
redacted error/log summary
remaining blockers
```

Classify the final result as one of:

- `PREVIEW ACCEPTED`
- `PREVIEW BLOCKED`
- `LOCAL ONLY`

Do not use `Production Ready`, do not promote the deployment, and do not merge the PR. If anything fails, stop at the first broken boundary, provide the evidence and propose a narrowly scoped fix.

Rollback must be possible by setting `ENABLE_ORGANIZATION_MVP=0` on the Backend Preview and redeploying/rolling back the Frontend Preview. Do not drop the additive Organization tables during rollback.

---

Supporting repository documents:

- `backend/docs/integration/ORGANIZATION_B2_DEPLOYMENT_REPORT.md`
- `docs/organization/FRONTEND_B2_INTEGRATION_GUIDE.md`
- `docs/organization/ORGANIZATION_MVP_CONTRACT_V0_1.md`
- `docs/VERCEL_PREVIEW_PROXY.md`
