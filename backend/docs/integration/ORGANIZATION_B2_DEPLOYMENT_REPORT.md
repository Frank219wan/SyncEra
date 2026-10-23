# Organization B2 Deployment Preparation Report

Date: 2026-10-23

Branch: `feature/organization-mvp`

Scope: Career Helping Centre / TVET B2 only

Cloud status: not deployed or security-accepted

## Outcome

The local B2 flow is connected from the existing Organization frontend modules to the FastAPI analysis endpoint. It accepts reviewed fictional student records, applies deterministic Moderate/Fast scoring, stores revisioned workspace/analysis records, and returns student recommendations, Skill Gaps, action plans and cohort interventions.

B1 HR remains disabled. MiniMax is not called by B2. No real student, CV or employee data is approved.

## Implemented flow

```text
/organization/tvet/*
  → relative /api/v1 request
  → Vite local proxy or protected Vercel Frontend Function
  → POST /api/v1/organizations/career_centre/analyze
  → Organization repository with revision CAS
  → deterministic organization-b2-v0.1 scoring
  → existing Career / Gap / Cohort / Workshop UI modules
```

## Verification evidence

| Boundary | Result | Evidence |
|---|---|---|
| Frontend contract/unit suite | Passed | 85 tests passed on the latest `main` baseline |
| Frontend Real build | Passed | `VITE_API_MODE=real pnpm build` |
| Backend suite | Passed | 129 passed, 3 skipped; the Organization PostgreSQL test requires `TEST_DATABASE_URL` |
| Static OpenAPI | Passed | Runtime B2 response validated against `OrgEnvelope`; 217 component references, none missing |
| Direct HTTP cross-stack | Passed | Individual, fictional upload and B2 tests: 3/3 |
| Vite same-origin cross-stack | Passed | `5174 → /api/v1 → 8001`: 3/3 |
| B2 scenario/CAS | Passed locally | Moderate 200 → Fast 200/revision 2 → stale revision 409 |
| Deep Organization URL | Passed at HTTP level | `/organization/tvet/students` returned 200 with app root |
| PostgreSQL/Neon B2 persistence | Pending isolated database | `test_organization_postgres.py` runs only with `TEST_DATABASE_URL` |
| Interactive browser rendering | Pending | No interactive browser runner was available in this local session |
| Protected Vercel Preview | Pending | Requires team-controlled Vercel and Neon configuration |

The migration manifest, explicit Organization-host allowlist and local regression suite have been rerun successfully. CI must still repeat them on the proposed commit.

## Database design and migration

Migration `backend/migrations/20261023_04_organization_mvp.sql` creates:

- `organization_workspaces`: reviewed synthetic input, current revision and JSONB workspace state;
- `organization_analyses`: immutable analysis results tied to input revision, snapshot and scenario;
- `organization_plan_versions`: reserved versioned plans with human approval state;
- `organization_analysis_calls`: reserved idempotency ledger for a future gated explanation model.

`PostgresOrganizationRepository` shares the existing serverless-safe profile connection pool. Revision updates use a conditional SQL update; two callers using the same revision cannot both succeed. Vercel startup fails if Organization is enabled without PostgreSQL or without its schema. There is no hosted SQLite fallback.

The official migration entry point now includes the Organization migration:

```powershell
cd backend
$env:DATABASE_URL = '<isolated Neon Preview pooled TLS URL>'
python -m scripts.migrate_postgres
```

Do not paste the actual URL into chat, source control, frontend variables or command history intended for sharing.

## Environment variables

### Backend Preview

```text
PROFILE_STORE=postgres
DATABASE_URL=<server-side Neon Preview pooled URL; sslmode=require or stronger>
ENABLE_ORGANIZATION_MVP=1
FRONTEND_ORIGINS=<exact approved Frontend Preview HTTPS origin>
AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter
```

Keep `ENABLE_LIVE_CAREER_RECOMMENDATION=0` unless a separate paid-model review approves it. B2 does not need a MiniMax key.

### Frontend Preview

```text
VITE_API_MODE=real
BACKEND_PREVIEW_ORIGIN=<exact protected Backend feature/organization-mvp Preview origin>
BACKEND_PROTECTION_BYPASS_SECRET=<server-only Backend automation bypass secret>
```

The bypass secret must never use a `VITE_` prefix. The proxy accepts only explicit SyncEra Backend branch-alias patterns. If Vercel generates a different alias from the expected `feature-organization-mvp` form, update and test the exact allowlist rather than broadening it.

## Deployment order

Both Frontend and Backend `vercel.json` files currently disable Git-triggered deployment. The PR push alone will not prove or necessarily create a Preview; use an approved manual Preview deployment for the exact commit. Do not enable Production auto-deployment as part of this acceptance run.

1. Create or select an isolated Neon Preview branch/database. Do not use Production.
2. Set `TEST_DATABASE_URL` locally or in protected CI and run the PostgreSQL integration tests.
3. Run the official migration script against that Preview database.
4. Configure Backend Preview variables, including `ENABLE_ORGANIZATION_MVP=1`.
5. Deploy the Backend branch Preview and verify protected health/OpenAPI.
6. Configure the Frontend branch-scoped Preview variables with the exact Backend Preview origin.
7. Deploy the Frontend Preview with Vercel Authentication and the `/api/v1/*` WAF/rate-limit rule enabled.
8. Use fictional records to perform Moderate → cohort selection → Fast → stale revision 409.
9. Verify a new Backend Function instance can continue the same workspace revision, proving Neon rather than process memory is used.
10. Inspect browser assets, headers and Function logs for secrets or personal data.

## Rollback

1. Set `ENABLE_ORGANIZATION_MVP=0` in the affected Backend Preview and redeploy, or roll back the Preview deployment.
2. Roll the Frontend Preview back to the previous deployment so the B2 route is no longer exposed by its proxy.
3. Leave the additive Organization tables in place; do not drop them during an incident rollback.
4. Rotate the protection bypass secret if it may have been exposed.

## Current blockers

- No isolated `TEST_DATABASE_URL` was supplied, so real PostgreSQL B2 persistence and concurrent CAS are not yet evidenced.
- The exact Vercel-generated Backend branch alias is unknown until the branch is pushed/deployed.
- Preview environment variables, Authentication and WAF settings need dashboard verification.
- Interactive browser rendering and Cloud logs have not been captured.
- The implementation is committed on its feature branch for PR review; no cloud deployment is claimed here.

## Release decision

Local implementation: ready for CI and code review.

Neon persistence: implemented, not yet verified against an isolated real database.

Vercel Preview: deployment-prepared, not deployed.

Production: not ready and not authorized.
