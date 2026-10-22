# SyncEra Neon / MiniMax / Vercel Preview E2E report

Date: 2026-10-22 (Asia/Kuala_Lumpur)

## Overall result

**PARTIALLY WORKING.** The isolated Neon database is migrated and the actual FastAPI + PostgreSQL integration flow passes. The protected Vercel Preview chain and a billable Tencent TokenHub call have not been verified. A ready build, merged code, model-version string, or local test is not evidence of a live provider call.

| Required verdict | Result | Basis |
| --- | --- | --- |
| FRONTEND REAL API | **PASS** for the previously audited Production deployment; **NOT VERIFIED** for this branch's Preview | Earlier browser Network and Vercel runtime evidence showed Production Radar read-only calls to the real FastAPI origin. Current Preview configuration and fresh Network capture were unavailable. |
| MINIMAX LIVE API | **NOT VERIFIED** | No approved billable call was made. No redacted TokenHub success log exists for this branch. |
| POSTGRESQL PERSISTENCE | **PASS** in isolated Neon application integration; **NOT VERIFIED** in Vercel Preview | Two FastAPI clients using separate PostgreSQL pools read the same synthetic profile, confirmed it with CAS, and recommended against it. No deployed Preview request was observed. |

## Source and deployment identity

| Item | Status | Evidence |
| --- | --- | --- |
| Latest fetched `origin/main` | **PASS** | `9b9e01de2dc06833569feb1063ec130950fbb3ae`; `git fetch origin --prune` was run before integration. |
| Development branch | **PASS** | `feature/postgres-preview-e2e`, integrated by fast-forwarding to the latest main and restoring the preserved candidate changes. Commit `eac6b3d52fd30e0600496a29ff8ad3fa824c7508` was pushed to `origin/feature/postgres-preview-e2e`. |
| Draft PR URL | **BLOCKED** | The GitHub draft form was prepared, but local browser use was disabled in Work settings before submission. No PR was created. Proposed compare page: https://github.com/Frank219wan/SyncEra/compare/feature/postgres-preview-e2e?expand=1 |
| Frontend Preview URL | **NOT VERIFIED** | Could not inspect the newly pushed branch's Vercel deployment. |
| Backend Preview URL | **NOT VERIFIED** | Could not inspect the newly pushed branch's Vercel deployment. |
| Preview deployment SHA / build / function runtime | **NOT VERIFIED** | A prior read-only Vercel view showed the previous main's backend deployment at `9b9e01d` Ready. This is not evidence that commit `eac6b3d` was built or served. |
| Vercel project settings | **PARTIAL / NOT VERIFIED** | Earlier audit observed frontend root = repository root/Vite, backend root = `backend`/FastAPI with Python 3.12. Fresh Preview settings and logs were not obtainable after browser access was disabled. |

## Neon migration and real database tests

| Item | Status | Evidence |
| --- | --- | --- |
| Project / branch | **PASS** | Existing isolated project `syncera-preview` (`aged-surf-56749653`), branch `preview` (`br-falling-glade-aox9nfes`), Singapore, PostgreSQL 18. No additional project or branch was created. |
| Database / role | **PASS** | Neon connection listed database `syncera_preview` and role `syncera_preview_owner`. SQL confirmed current target before migration. |
| Migration | **PASS** | Ran the idempotent `backend/migrations/001_profiles.sql` table creation against this branch and repeated it successfully. `public.profiles` exists; row count after cleanup was zero. |
| Real DB CREATE / GET / UPDATE | **PASS** | Random fictional profile was inserted, read in a separate connector request, and updated to revision 2. |
| Real DB CAS / concurrency | **PASS** | Two competing updates at revision 1 yielded one revision 2 row and one zero-row result. A stale revision 1 update also returned zero rows. The FastAPI integration test observed concurrent confirmations as HTTP 200 and 409. |
| Cross-connection persistence | **PASS** | Separate `PostgresProfileStore` pools and HTTP clients read the same profile and revision. |
| Confirmed profile recommendation | **PASS** | Actual PostgreSQL-backed FastAPI integration test returned HTTP 200 with recommendations for Moderate and Fast; unconfirmed recommendation returned 422. Scoring remains deterministic `tech-v1`. |
| Test data cleanup | **PASS** | Only self-generated synthetic profile IDs were deleted; final Neon count was zero. No Production database was connected or modified. |
| Direct migration vs pooled application URL | **PARTIAL / NOT VERIFIED** | The Neon SQL connector executed migration on the specified branch. The connector-issued pooled TLS URL was used only in a no-echo process stdin for the application integration test. The direct connection string route was not separately verified. No URL or password was stored in source, PR, report, or logs. |

## MiniMax, API, and UI acceptance

| Check | Status | Evidence / limitation |
| --- | --- | --- |
| TencentTokenHubAdapter code | **PASS** | Present from main; configured extraction model string is `tokenhub:minimax-m3`; recommendation scoring policy/version is `tech-v1`. Unit tests use mocked transport. |
| Backend Preview adapter enabled | **NOT VERIFIED** | Could not inspect or set Preview-only `AI_ADAPTER_MODULE`. Production's earlier inspected variable list did not include it. |
| `TENCENT_TOKENHUB_API_KEY` configured | **NOT VERIFIED** | Could not inspect Preview secret presence. No key value was retrieved or printed. |
| Protected, rate-limited Preview | **PARTIAL / NOT VERIFIED** | Earlier Vercel view showed Standard Protection/Vercel Authentication. Current branch deployment protection and an application-level usage/expense limit were not verified. |
| Paid synthetic `POST /api/v1/profiles/normalize` | **NOT VERIFIED** | User explicitly declined billable MiniMax testing. No provider request was made. |
| Live `meta.model_version` and redacted provider log | **NOT VERIFIED** | Expected live extraction version is `tokenhub:minimax-m3`; only offline code/tests support it. There is no live response or successful provider log. |
| Normalize / Confirm in Neon | **PASS** | Synthetic form-only FastAPI flow with the actual Neon database succeeded in the local integration test. This did not invoke MiniMax. |
| Recommendation / Moderate / Fast | **PASS** | PostgreSQL-backed local HTTP tests passed; deployed Preview remains **NOT VERIFIED**. |
| Skill Gap / Skill Map / Roadmap | **NOT VERIFIED** for Preview | Existing backend and local cross-stack tests passed; the complete deployed UI flow was not run. |
| Frontend Preview real API / Network / CORS | **NOT VERIFIED** | Preview-only `VITE_API_MODE=real`, Backend Preview URL, exact `FRONTEND_ORIGINS`, rebuild, and browser Network remain unverified. |
| Deep links, refresh, static assets | **NOT VERIFIED** for this Preview | Existing SPA routing tests passed locally. |

## Tests performed

| Test | Status | Result |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | **PASS** | Lockfile install completed. |
| `pnpm test` | **PASS** | 29 passed. |
| `pnpm build` | **PASS** | TypeScript and Vite build passed. |
| Backend dependency install | **PASS** | `backend/requirements-dev.txt` installed in Python 3.12 virtual environment. |
| Backend `pytest tests -q` without DB URL | **PASS** | 82 passed, 1 skipped (real DB integration). |
| Real Neon PostgreSQL integration | **PASS** | 8 passed, including FastAPI cross-pool flow and CAS; no skipped tests in that targeted run. |
| Repository cross-stack test | **PASS** | 1 passed against disposable localhost FastAPI/SQLite. |
| `pip check` / `git diff --check` | **PASS** | No broken requirements or whitespace errors. |

## Safety and release blockers

- **PASS:** No Production environment variable, deployment protection setting, or database was changed. No push to `main`, force push, merge, or Production migration occurred.
- **PASS:** PostgreSQL is selected only by explicit `PROFILE_STORE=postgres`; missing `DATABASE_URL` fails instead of falling back. The previous Production SQLite selection remains unchanged without that variable.
- **PASS:** Hosted uploads are disabled unless explicitly enabled and capped at 3 MiB. Profile readback lacks ownership authorization and therefore requires explicit Preview opt-in; it is absent from hosted Production.
- **BLOCKED:** Preview-only Vercel configuration was explicitly authorized by the user, but a prior automatic review rejected opening a Vercel operation plugin because it could not establish the permission scope. Later, the browser reported that local browser use is disabled in Work settings. No Vercel settings were changed through an alternate route.
- **BLOCKED:** The two project Preview URLs, deployment protection for this branch, Preview env scopes, build/runtime logs, exact CORS, and deployed frontend Network must be checked before Cloud E2E can pass.
- **NOT VERIFIED:** No billable MiniMax call is authorized. Even with a configured key, do not invoke TokenHub until the user grants separate approval and protected Preview usage controls are verified.

## Next merge / release step

Create the Draft PR from the pushed branch; inspect its CI and Preview deployments. Configure only the protected Backend Preview with the isolated Neon pooled TLS URL, `PROFILE_STORE=postgres`, exact frontend Origin, and optional Preview-only TokenHub secret/adapter. Configure only Frontend Preview with `VITE_API_MODE=real` and the actual Backend Preview URL, then rebuild. Keep TokenHub calls disabled until separately approved. Verify the deployed synthetic Normalize → Confirm → Recommendation → Skill Map → Roadmap sequence, request IDs, revisions, snapshot, versions, and redacted provider log before any release decision. Review the Production storage and authentication plan before merging code that depends on PostgreSQL.
