# Individual API, Neon and Vercel verification — 2026-10-23

## Scope and architecture

This audit starts from merged PR #19 (`b307441`, `integration/career-radar-dosm-pr15`). PR #20 is still a separate Draft with overlapping changes; it was not merged. The code path in real mode is Browser → same-origin `/api/v1/*` → Frontend Vercel Function (`server/proxy.ts`) → protected FastAPI Preview → `PostgresProfileStore` on Neon Preview → deterministic recommendation service → UI. This path is **not yet proven end to end on the current Vercel deployments**.

The current audit branch is `codex/individual-e2e-audit-20261023`. It does not change Production, main, Neon data, scoring weights, or provider configuration. Test inputs are fictional. No paid MiniMax request was made.

## Verification matrix

| Individual stage | Result | Evidence and limit |
| --- | --- | --- |
| Entry, goal, stage, skills/interests/preferences | PASS (code/local) | Existing Intake state and form-to-contract mappings; frontend tests and build pass. Browser Preview journey not completed. |
| Synthetic PDF/DOCX upload | PASS (local) | Cross-stack tests upload fictional PDF and DOCX via the proxy to FastAPI. Hosted upload needs `ENABLE_SYNTHETIC_UPLOAD=1` on a protected Backend Preview. |
| Five-scenario assessment, skip/Other/consent/clear | PASS (local) | PR #19 form and confirm/CAS tests cover all five slots, null skips, E text, consent and explicit clear. No live Neon write was performed in this audit. |
| Normalize and user confirmation | PASS (local) | Cross-stack and local HTTP tests return 200; same profile ID survives confirmation. |
| Neon persistence and fresh-request readback | NOT VERIFIED (current deployment) | Store code writes JSONB and uses revision CAS. PostgreSQL integration tests were skipped because no isolated `TEST_DATABASE_URL` was available. Read-only Neon inspection found the tables; it did not write or read this run's profile. |
| Stale revision conflict | PASS (local) | Local HTTP and backend tests return 409 `SNAPSHOT_CONFLICT`; PostgreSQL CAS remains untested in this run. |
| Career radar/trend snapshot | PASS (local fixture) | `trends/roles` returned a synthetic snapshot; DOSM radar is a separately gated prepared dataset, not a role-matching snapshot. |
| Career recommendations, Moderate/Fast, skill gaps | PASS (code/local) | Real mode POSTs actual confirmed `profile_id`, scenario and snapshot to `/recommendations`; backend applies and validates 45/20/20/15 scoring. New frontend validation rejects mismatched/malformed result context, scores and evidence. Existing local tests cover both scenarios and psychology score independence. |
| Role detail and evidence | PASS (local) | Local HTTP test reads recommended role and evidence. Synthetic evidence remains labelled synthetic. |
| Skill Mind Map and Roadmap | PASS (local) | Local HTTP test creates both from the confirmed profile and recommendation gap. |
| Individual growth/progress sync | FAIL | Backend `/progress/skills` intentionally returns 503; durable progress is not implemented. Do not claim a persistent growth experience. |
| Protected Frontend `/api/v1/health` | FAIL (live) | Authenticated `b307441` integration Preview and the new `c43667c` audit-branch Preview both returned `PROXY_NOT_CONFIGURED` JSON. The Preview proxy variables seen in Vercel were scoped to the older `integration/postgres-preview-backend` branch. |
| Protected Backend `/api/v1/health` | FAIL (live audit branch) | A new Backend deployment for `c43667c` is Ready, but an authenticated health request returned HTTP 500 `FUNCTION_INVOCATION_FAILED`. Its runtime log identifies the safe fail-closed startup error: `Vercel Preview requires PROFILE_STORE=postgres; SQLite fallback is disabled`. No credential or request body was read. |
| Full protected Vercel → Neon journey | BLOCKED | The matching new deployments are not API-healthy or configured for each other. No live POSTs were sent. |

## Data and model provenance

- Current default recommendations use the checked-in synthetic role/skill catalogue in `backend/app/catalogue.py` and a synthetic market snapshot loaded through `backend/app/approved_data.py`. The backend returns `synthetic_demo` (or `mixed_demo` when approved evidence is combined with synthetic roles), `is_mock=true`. The frontend must display those labels and may not call the results verified MASCO occupations or observed hiring demand.
- A read-only aggregate inspection of Neon Preview (`syncera-preview`, branch `preview`) found five active psychology questions, three career role candidates with `source_verification=pending`, zero active career roles, zero `role_skills`, three DOSM signals with zero verified, and zero active trend snapshots. The present tables therefore cannot power a verified MASCO × DOSM role matcher. No candidate was activated or altered.
- MASCO classifications/tasks, DOSM dated market signals and role-skill relationships have distinct provenance. The prepared DOSM JMI/QES radar reports major occupation groups, advertisement counts and survey context; it does not provide validated named-role skill demand or a compatible recommendation snapshot. The DOSM radar is disabled by default. Its group counts must not be presented as job-level demand.
- The backend, not MiniMax, computes match scores and skill gaps with 45% skill compatibility, 20% interests/preferences, 20% scenario outlook and 15% transition feasibility. Psychology answers do not enter that calculation. The optional career analysis is labelled `minimax` only on a successful provider result; otherwise it is a `rules_fallback` with a status such as `disabled` or `unavailable`. The Preview setting for live career analysis was not observed enabled, and this audit did not enable it.

## Confirmed deployment and security observations

| Item | Observation |
| --- | --- |
| Frontend | `syncera-frontend` Preview from `integration/career-radar-dosm-pr15` at `b307441` was Ready. Its protected branch alias returned `PROXY_NOT_CONFIGURED` for authenticated `GET /api/v1/health`; response status was not captured in the browser check. |
| Backend | Earlier Ready versions observed were feature commit `dace8f8` and `integration/postgres-preview-backend` commit `eb4fee9`; no Backend `b307441` Ready deployment was observed. After this audit branch was pushed, Vercel marked its `c43667c` Backend deployment Ready, while authenticated health returned 500 `FUNCTION_INVOCATION_FAILED`. The runtime explicitly requires `PROFILE_STORE=postgres` and refuses SQLite fallback. Ready means deployed, not functioning. Recent earlier build checks reported the Vercel free-tier deployment rate limit. |
| Environment scope | Frontend `BACKEND_PREVIEW_ORIGIN`, `BACKEND_PROTECTION_BYPASS_SECRET`, `VITE_API_MODE` and `VITE_API_BASE_URL` were present but scoped to `integration/postgres-preview-backend`. Backend `PROFILE_STORE`, `DATABASE_URL`, `FRONTEND_ORIGINS` and adapter settings were also observed under that older branch scope. Values were not read or printed. |
| Protection | Both Vercel projects showed Standard Vercel Authentication. Anonymous HEAD requests to the older and new Frontend `/api/v1/health` aliases and older and new Backend `/api/v1/health` aliases returned HTTP 302 to Vercel SSO. This verifies those tested aliases reject anonymous access at the edge; it does not prove every future alias is configured identically. |
| Abuse controls | Frontend WAF showed a custom `preview-api-rate-limit` rule. The Function also enforces a route/method/query allowlist, request caps, upstream timeout, same-origin POST check and per-instance rate backstop. The exact WAF rule conditions were not re-tested. |
| Backend origin | The proxy previously accepted only the older `integration-postgres-pre` Backend alias. This branch adds the `integration-career-rada` alias pattern while retaining the project-specific HTTPS allowlist. No arbitrary host or URL is accepted. |

There is no browser-facing bypass secret in this change. Browser requests remain relative `/api/v1/*`; the bypass header is set only by the Frontend Function. Hosted profile readback remains unavailable through the proxy because it has no user ownership checks. No Production environment or protection setting was changed.

## Changes and test evidence

Changed `src/services/api-contract.ts` and `src/services/api.ts` to validate real recommendation profile/scenario/snapshot identity, request provenance, ordered role IDs, score breakdown arithmetic, evidence IDs and skill gaps before rendering. An invalid result now raises `INVALID_RECOMMENDATIONS` with the Backend request ID when supplied; it never selects demo data. Added regression tests in `tests/api-contract.test.ts`. Changed `server/proxy.ts`, `tests/preview-proxy.test.ts` and `docs/VERCEL_PREVIEW_PROXY.md` for the new protected integration branch alias and corrected Preview scope/upload instructions. Extended `tests/live-api-contract.test.mjs` with role detail and stale revision checks. No migration was made.

| Layer | Command / observation | Result |
| --- | --- | --- |
| Frontend unit/contract | `npm test` | 59 passed, 0 failed. |
| Frontend TypeScript/build | `npm run build` | Passed (TypeScript and Vite). |
| Backend suite | `python -m pytest tests -q -rs` in `backend` | 123 passed, 2 skipped (both require `TEST_DATABASE_URL`). |
| Cross-stack local | `node --experimental-strip-types --test tests/cross-stack.test.ts` against local FastAPI and temporary SQLite | 2 passed; fictional PDF/DOCX → assessment → confirm → recommendation/learning flow. |
| Local HTTP contract | `API_BASE_URL=http://127.0.0.1:8766/api/v1 node --test tests/live-api-contract.test.mjs` | 1 passed. Recorded 200 for health, normalize, confirm, trends, recommendations, role detail, evidence, skill map and roadmap; stale confirm returned 409. |
| Neon Preview | Read-only schema and aggregate inspection | Tables/record counts checked; no write, readback or deletion in this audit. |
| Vercel Preview | Authenticated Frontend and Backend health requests; anonymous edge checks | New PR-branch deployments both Ready, but Frontend returned `PROXY_NOT_CONFIGURED` and Backend health HTTP 500 because `PROFILE_STORE=postgres` was absent from that deployment's effective environment. Anonymous checked aliases redirected to SSO (302). Full flow not run. |

## Outstanding work before live acceptance

1. Correct the `c43667c` Backend Preview's effective Preview-only `PROFILE_STORE=postgres` scope; the runtime log proves it is absent for that deployment. Verify TLS `DATABASE_URL` and `FRONTEND_ORIGINS` scope without exposing their values. Redeploy only after configuration is corrected and any Vercel rate window permits it. Confirm Backend health 200 and a fresh-request Neon operation before calling it usable.
2. In **Preview only**, scope Frontend `VITE_API_MODE=real`, `BACKEND_PREVIEW_ORIGIN` and `BACKEND_PROTECTION_BYPASS_SECRET` to the intended integration branch. Deploy the tested code to that integration branch through the normal review process, then set the origin to the exact protected Backend `integration-career-rada` alias allowed by the Function. The temporary `codex/individual-e2e-audit-20261023` Backend alias is deliberately not allowlisted, so do not point the proxy at it. Keep the bypass secret server-side; never use `VITE_*` for it. Enable `ENABLE_SYNTHETIC_UPLOAD=1` only for a protected fictional CV acceptance run. Do not enable live MiniMax analysis to perform this audit. Do not broaden Production scope.
3. Verify Frontend and Backend Vercel Authentication and the WAF rule on the exact new aliases. Test anonymous `/api/v1/health` denial, then authenticated same-origin health 200. Confirm no secret appears in browser Network or build assets.
4. Use one new fictional profile and record only its ID and non-sensitive request metadata. Run normalize/upload → five-answer assessment (including skip/Other/consent) → confirm → recommendations in Moderate/Fast → role/evidence → skill map → roadmap. Verify fresh-request Neon readback through a securely authorized route or an exact-ID, read-only database query. Confirm stale revision 409 and no duplicate profile. Delete only that execution's exact synthetic row after explicit ownership verification and approval.
5. Activate a market adapter only after MASCO IDs/tasks, DOSM granularity/mapping, role skills, evidence and verification status have been reviewed and approved. The current pending rows and empty active relationships are a data blocker, not a code permission to invent values. Durable growth/progress remains a separate feature gap.

**Acceptance status:** local contract path passes; protected Vercel → Neon Individual E2E and verified MASCO × DOSM × MiniMax integration are not complete.
