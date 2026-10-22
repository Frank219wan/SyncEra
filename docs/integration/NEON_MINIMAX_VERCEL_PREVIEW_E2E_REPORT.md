# SyncEra Neon / MiniMax / Vercel Preview E2E report

Date: 2026-10-22 (Asia/Kuala_Lumpur)

## Overall result

**PARTIALLY WORKING.** The isolated Neon database is migrated and the actual FastAPI + PostgreSQL integration flow passes. The protected Vercel Preview chain and a billable Tencent TokenHub call have not been verified. A ready build, merged code, model-version string, or local test is not evidence of a live provider call.

| Required verdict | Result | Basis |
| --- | --- | --- |
| FRONTEND REAL API | **NOT VERIFIED** for the latest Preview deployment | Earlier browser Network and Vercel runtime evidence showed a prior Production Radar deployment making real FastAPI read-only calls. Current Preview configuration and a fresh Network capture were unavailable. |
| MINIMAX LIVE API | **NOT VERIFIED** | No approved billable call was made. No redacted TokenHub success log exists for this branch. |
| POSTGRESQL PERSISTENCE | **NOT VERIFIED** in Vercel Preview | The isolated Neon application integration passed: two FastAPI clients using separate PostgreSQL pools read the same synthetic profile, confirmed it with CAS, and recommended against it. No deployed Preview request was observed. |

## Source and deployment identity

| Item | Status | Evidence |
| --- | --- | --- |
| Latest fetched `origin/main` | **PASS** | `9b9e01de2dc06833569feb1063ec130950fbb3ae`; `git fetch origin --prune` was run before integration. |
| Development branch | **PASS** | `feature/postgres-preview-e2e`, integrated by fast-forwarding to the latest main and restoring the preserved candidate changes. Commit `eac6b3d52fd30e0600496a29ff8ad3fa824c7508` was pushed to `origin/feature/postgres-preview-e2e`. |
| Draft PR URL | **BLOCKED** | GitHub's public PR API returned no open PR for this head branch. The GitHub draft form was prepared, but local browser use was disabled in Work settings before submission. No authenticated GitHub PR creation tool or HTTPS credential was available. Proposed compare page: https://github.com/Frank219wan/SyncEra/compare/feature/postgres-preview-e2e?expand=1 |
| Frontend Preview URL | **NOT VERIFIED** | Could not inspect the newly pushed branch's Vercel deployment. |
| Backend Preview URL | **NOT VERIFIED** | Could not inspect the newly pushed branch's Vercel deployment. |
| Preview deployment SHA / build / function runtime | **NOT VERIFIED** | A prior read-only Vercel view showed the previous main's backend deployment at `9b9e01d` Ready. This is not evidence that commit `eac6b3d` was built or served. |
| Vercel project settings | **PARTIAL / NOT VERIFIED** | Earlier audit observed frontend root = repository root/Vite, backend root = `backend`/FastAPI with Python 3.12. Fresh Preview settings and logs were not obtainable after browser access was disabled. |

### 2026-10-22 branch HEAD follow-up

`git fetch origin --prune` was repeated. `origin/main` remained `9b9e01de2dc06833569feb1063ec130950fbb3ae`; branch HEAD and its remote both remained `dba63cb34f29fa4408c5f357e391ffb07da5be4e` before this report update. The ten committed changed paths are the PostgreSQL store, migration, app wiring, tests, example configuration, and this report (333 additions, 7 deletions); `git diff --check origin/main...HEAD` passed. The candidate's older `MAIN_VERCEL_CLOUD_E2E_AUDIT.md` is still untracked and was preserved without alteration or commit.

GitHub's public commit-status API associates **two successful Vercel checks** with the exact branch HEAD:

| Project | GitHub check | Vercel deployment details page | Direct Vercel environment / Source SHA / runtime URL |
| --- | --- | --- | --- |
| Backend | **PASS:** `Vercel – syncera-backend` = success | https://vercel.com/frank219wan/syncera-backend/FtnmKwJjsEvfU1pdreEeiM3LcGos | **NOT VERIFIED** |
| Frontend | **PASS:** `Vercel – syncera-frontend` = success | https://vercel.com/frank219wan/syncera-frontend/E9qpWQqZQxXnc1JMfgFT8mvuKVLA | **NOT VERIFIED** |

The public Vercel deployment API returned HTTP 403 without account access. A successful GitHub check establishes that Vercel reported deployment completion; it does not establish Preview variable scope, a protected runtime, a working API, or Cloud E2E.

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
| Non-paid synthetic FastAPI → Neon flow | **PASS locally; NOT VERIFIED on Vercel** | With `PROFILE_STORE=postgres`, `AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter`, and a synthetic Preview Origin, local FastAPI returned 200 for Normalize, Confirm (revision 2), Moderate, Fast, Skill Map, Roadmap, and CORS preflight. Normalize metadata was `rules-v0.1` / `synthetic_demo` / `is_mock=true`; both recommendation scenarios returned `tech-v1`. A second app instance read the confirmed profile through Neon. The test row was deleted; final Preview table count was zero. No TokenHub key or request was used. |
| Repository cross-stack test | **PASS** | 1 passed against disposable localhost FastAPI/SQLite. |
| `pip check` / `git diff --check` | **PASS** | No broken requirements or whitespace errors. |

## Safety and release blockers

- **PASS:** No Production environment variable, deployment protection setting, or database was changed. No push to `main`, force push, merge, or Production migration occurred.
- **PASS:** PostgreSQL is selected only by explicit `PROFILE_STORE=postgres`; missing `DATABASE_URL` fails instead of falling back. The previous Production SQLite selection remains unchanged without that variable.
- **PASS:** Hosted uploads are disabled unless explicitly enabled and capped at 3 MiB. Profile readback lacks ownership authorization and therefore requires explicit Preview opt-in; it is absent from hosted Production.
- **BLOCKED:** Preview-only Vercel configuration was explicitly authorized by the user, but a prior automatic review rejected opening a Vercel operation plugin because it could not establish the permission scope. Later, the browser reported that local browser use is disabled in Work settings. No Vercel settings were changed through an alternate route.
- **BLOCKED:** The two project Preview URLs, deployment protection for this branch, Preview env scopes, build/runtime logs, exact CORS, and deployed frontend Network must be checked before Cloud E2E can pass.
- **NOT VERIFIED:** No billable MiniMax call is authorized. Even with a configured key, do not invoke TokenHub until the user grants separate approval and protected Preview usage controls are verified.
- **BLOCKED:** Two separately protected project domains may prevent a browser from calling the backend: the frontend currently uses cross-origin `fetch` without `credentials: 'include'`, and its JSON/`X-Request-ID` requests cause CORS preflight. Vercel Authentication protects Preview requests, including preflight. Do not put a protection bypass token in `VITE_*`, a browser URL, or a public rewrite. If the actual browser Network shows authentication redirects or failed OPTIONS, stop and address the protected cross-project architecture before claiming frontend real API or full Cloud E2E.

## Exact manual Preview configuration while Vercel access is unavailable

1. In GitHub, open the compare link above, verify **base = `main`** and **compare = `feature/postgres-preview-e2e`**, enter the title `feat(backend): add isolated PostgreSQL Preview profile store`, choose **Create draft pull request**, and leave it unmerged. Confirm the PR head is the latest branch commit.
2. In **each** existing Vercel project, open the deployment details page above. Confirm **Environment = Preview**, Git branch `feature/postgres-preview-e2e`, and source commit matching the current remote branch HEAD (refresh it after this report update); copy the actual HTTPS deployment/branch URL displayed in that page. The dashboard link itself is not the runtime API URL. Verify the backend Root Directory is `backend` with FastAPI/Python auto-detection and the frontend Root Directory is the repository root with Vite output `dist`.
3. In both projects, **Settings → Deployment Protection**, verify Vercel Authentication with **Standard Protection** still covers Preview. Do not turn it off. Test each runtime URL anonymously and confirm authentication is required, then sign in with an authorized Vercel account for the test.
4. In **syncera-backend → Settings → Environment Variables**, add variables at **Preview, specific Git branch `feature/postgres-preview-e2e` only**: `PROFILE_STORE=postgres`; `DATABASE_URL` = the **pooled, TLS-required** URL for existing Neon project `aged-surf-56749653`, branch `br-falling-glade-aox9nfes`, database `syncera_preview`, role `syncera_preview_owner`; `AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter`; `FRONTEND_ORIGINS` = exact HTTPS origin of the verified Frontend Preview host; `MAX_CV_UPLOAD_BYTES=3145728`. Enter the database URL directly in Vercel's server-side variable field, never in chat, Git, logs, PR, or `VITE_*`. Leave `TENCENT_TOKENHUB_API_KEY`, all `TENCENT_TOKENHUB_*` variables, `ENABLE_SYNTHETIC_UPLOAD`, and `ENABLE_PROFILE_READBACK` unset for this non-paid test. Leave `ACTIVE_SNAPSHOT_ID` unset for bundled synthetic data.
5. In **syncera-frontend → Settings → Environment Variables**, add at **Preview, the same specific Git branch only**: `VITE_API_MODE=real` and `VITE_API_BASE_URL=https://<verified-backend-preview-host>`. Use the backend Preview runtime URL, never the Production backend or the Vercel dashboard URL. The frontend bundle may contain this public host but must contain no database URL or TokenHub key.
6. Create **new Preview deployments from that branch Git reference in both projects** after saving variables; verify their new Source SHA and environment again. Vite variables are embedded at build time, and old deployments do not acquire new variable values. Do not choose `main`, Production, or a production redeploy.
7. In signed-in browser DevTools, first inspect backend Preview `GET /api/v1/health`, frontend Preview page and `/individual/radar`, then the frontend's `OPTIONS` and `GET /api/v1/trends/roles` Network entries. Confirm the request reaches the **backend Preview host**, returns JSON 200, has the exact allowed Origin and no authentication redirect. If protection blocks the cross-project request or preflight, keep Cloud E2E **BLOCKED** and do not weaken protection or expose a bypass secret to the browser.
8. Only after the protected cross-project request works, use fictional form/text to run Preview `POST /api/v1/profiles/normalize` → review → `POST /api/v1/profiles/confirm` → `POST /api/v1/recommendations` for Moderate/Fast → Skill Map/Roadmap. Record HTTP status, request ID, synthetic profile ID/revision, snapshot ID, `data_label`, extraction `rules-v0.1`, and scoring `tech-v1`. Confirm persistence across requests and refresh; delete only self-generated test records in the isolated Neon Preview database. A TokenHub call and `tokenhub:minimax-m3` version are **not expected** in this non-paid run.

Vercel documents [branch-specific Preview variables](https://vercel.com/docs/environment-variables), [new deployments after variable changes](https://vercel.com/docs/environment-variables), [Git-reference deployments](https://vercel.com/docs/git), and [Standard Protection](https://vercel.com/docs/deployment-protection).

## Next merge / release step

Create the Draft PR from the pushed branch; inspect its CI and Preview deployments. Configure only the protected Backend Preview with the isolated Neon pooled TLS URL, `PROFILE_STORE=postgres`, exact frontend Origin, and `AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter`. Configure only Frontend Preview with `VITE_API_MODE=real` and the actual Backend Preview URL, then rebuild. Do not call TokenHub in this acceptance run. Verify the deployed synthetic Normalize → Confirm → Recommendation → Skill Map → Roadmap sequence, request IDs, revisions, snapshot, extraction `rules-v0.1`, and deterministic scoring `tech-v1` before any release decision. Review the Production storage and authentication plan before merging code that depends on PostgreSQL.
