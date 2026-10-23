# Individual profile, psychology and DOSM radar fix

Date: 2026-10-23. Target: `integration/career-radar-dosm-pr15` (synchronized through `41640d1`, including PR #24 questionnaire layout). This report distinguishes local checks from the existing integration Preview and from a deployment of this fix branch.

## Root causes and behavior

| Area | Before | After |
| --- | --- | --- |
| New profile | `futureproof-v1` restored the previous Individual draft without a reset action. | My Profile offers **Start New Profile** with a confirmation dialog. Confirmation writes a blank Individual profile, clears ID/revision, answers, selected snapshot, matches and learning plans, and navigates to `/individual/intake/start`. Cancel changes nothing. Locale and Organization HR/TVET state remain. No server-side Profile is deleted; browser storage is scoped to `futureproof-v1`, never `localStorage.clear()`. |
| Psychology editing | My Profile → Edit Profile used a separate form without the questionnaire. Its browser-only save replaced a real ID with an empty ID, risking an unsaved assessment or duplicate profile. | Edit Profile reuses `PsychologyAssessmentForm`; existing ID/revision are retained. Real-mode edits go through Review → `POST /profiles/confirm`, which performs the existing PostgreSQL revision CAS update atomically and returns 409 on stale revisions. A normalized or uploaded profile does not undergo another Normalize/CV extraction on this path. All five answers, null skips, Other text and consent are sent. Clear sends five null answers, empty Other responses and false consent on confirmation. Incomplete Other text is blocked before normalization or confirmation. |
| Sample CV | Loading the sample in the intake form replaced an existing profile ID. | It retains the current ID, revision, upload provenance and assessment; deliberate sample edits are reviewed and confirmed on the same record. |
| DOSM radar | `/market/radar` was absent from the Preview proxy GET allowlist, so flags alone could not show the DOSM view. | The server proxy permits only GET `/api/v1/market/radar`, with at most one `period=YYYY-Qn`. Existing Preview-only origin, fixed HTTPS backend, secret header, body/response limits, timeout and per-instance rate backstop remain. Invalid paths, methods, query keys, repeated period, Production and arbitrary hosts are rejected. The UI chooses the DOSM view only when real API mode and `VITE_DOSM_MARKET_RADAR_ENABLED=true` are both set. API failures remain visible. |

The Backend Confirm contract already accepts optional psychology, occupation and interests. It uses `profile_revision` CAS, so no schema or scoring-weight change was needed. Confirm now sends supported occupation and interests for manual and CV profiles. Education, experience, vision and work preferences are still browser notes in this contract; the edit form says so. Psychology does not enter the deterministic 45/20/20/15 scoring formula.

## Market data boundary

`backend/data/dosm_market_q2_2026.json` is a prepared DOSM JMI/QES snapshot through **Q2 2026**, with JMI online job advertisements and QES employment measures kept in separate units. `backend/app/market_radar.py` validates available quarters and builds comparisons. `docs/DOSM_MARKET_RADAR.md` records source workbook lineage, attribution, limits and a pending source review. The API stays disabled by default (`DOSM_MARKET_RADAR_ENABLED` unset). No source-review approval was found, so this change does **not** activate the DOSM flags or describe the data as continuously live. Occupation-group counts are not role-level skill demand or a compatible recommendation snapshot. Matching remains on its existing synthetic-labelled role snapshot, and this change does not pass the DOSM snapshot ID into recommendations. MASCO and MiniMax data boundaries and scoring weights were not changed.

## Files

- State/reset and UI: `src/individual-state.ts`, `src/store.tsx`, `src/components/StartNewProfile.tsx`, `src/pages/Intake.tsx`, `src/pages/ProfileEdit.tsx`, `src/components/PsychologyAssessment.tsx`, `src/services/psychology-validation.ts`.
- Contract/radar/proxy: `src/services/api-contract.ts`, `src/services/radar-mode.ts`, `src/main.tsx`, `src/pages/ConnectedCareers.tsx`, `src/pages/LiveCareerRadar.tsx`, `server/proxy.ts`.
- Tests: `package.json`, `tests/individual-state.test.ts`, `tests/psychology-validation.test.ts`, `tests/radar-mode.test.ts`, `tests/api-contract.test.ts`, `tests/preview-proxy.test.ts`, `tests/cross-stack.test.ts`.

## Verification

| Check | Result | Scope |
| --- | --- | --- |
| `npm test` | PASS: 64 tests | Local unit/contract/proxy tests |
| `npm run build` (`tsc -b` + Vite production build) | PASS | Local frontend |
| `pytest backend/tests -q` | PASS: 123 passed, 2 skipped | Local backend, includes DOSM gate, recommendations and persistence tests |
| `tests/cross-stack.test.ts` against loopback FastAPI | PASS: 2 tests | Local SQLite + deterministic adapter; fictional PDF/DOCX upload, readback, edit/clear, stale 409, score invariance |
| Existing integration Frontend `/api/v1/health` | PASS: authenticated 200; anonymous 302 | Existing Vercel deployment only; checked 2026-10-23 |
| Existing integration Backend `/api/v1/health` | PASS: authenticated 200; anonymous 302 | Existing Vercel deployment only; checked 2026-10-23 |
| Fix-branch Frontend and Backend Preview, Neon readback, full cloud E2E | BLOCKED / NOT VERIFIED | PR #25 Vercel checks for both projects failed with the free-tier daily deployment limit (`api-deployments-free-per-day`, retry in 24 hours). Neither new branch deployment nor Neon E2E was verified. |
| DOSM source approval and enabled Preview UI | BLOCKED | Separate source review and explicit flag enablement required |

The local loopback used SQLite and a deterministic adapter. GitHub PR #25 has no merge conflict, but both Vercel checks were deployment-rate-limited; this is not an application test result. It does not prove Neon persistence, Vercel Authentication of the new branch, branch-scoped secrets, WAF behavior, or paid MiniMax operation. No real personal CV, Production setting, existing Neon record, or paid model call was used.

## Safe Preview deployment and acceptance

1. Merge only after review. For a PR-branch test, confirm both Vercel projects protect this exact Preview branch with **Vercel Authentication** and the existing WAF rule; anonymous GET `/api/v1/health` on both aliases must redirect (302), not expose API JSON. Do not change Production or public Backend aliases.
2. In **syncera-frontend**, verify Preview branch scope and values without displaying them: `VITE_API_MODE=real`, `BACKEND_PREVIEW_ORIGIN` (protected `syncera-backend` integration Preview alias, exact HTTPS origin), and server-only `BACKEND_PROTECTION_BYPASS_SECRET`. The frontend code and proxy changed, so deploy this PR branch after those settings are effective and the Vercel daily deployment quota allows it. The backend bypass value must never be placed in `VITE_*`, URLs, logs or source control. Ensure the existing WAF rate rule covers the new Frontend Preview alias. Leave `VITE_DOSM_MARKET_RADAR_ENABLED` off pending source review.
3. In **syncera-backend**, verify Preview branch scope of `PROFILE_STORE=postgres`, `DATABASE_URL` (Neon Preview pooled TLS secret), `FRONTEND_ORIGINS` (exact allowed Frontend HTTPS origins), and `AI_ADAPTER_MODULE` (approved deterministic adapter for this test). No Backend code or schema change in this PR requires a Backend redeploy if the already-protected integration Backend deployment and its settings remain valid. A separate Backend PR-branch deployment, if Vercel creates one automatically, needs its own Preview settings before its health can pass. Leave `DOSM_MARKET_RADAR_ENABLED` off. Do not enable the paid MiniMax adapter for this acceptance.
4. After the new Frontend Preview is Ready, authenticate and test same-origin `/api/v1/health` (200). With a new fictional profile only, test manual Normalize → five-question assessment (including a skipped question and Other) → Confirm → recommendations → role detail, skill map and roadmap. Test an intentionally stale revision (409), edit and clear the assessment, and compare career scores before/after psychology-only edits. Verify one exact profile ID and fresh-request Neon readback by an authorized route/query. Do not delete any existing record; any synthetic cleanup requires exact-ID ownership verification and separate authorization.
5. Only after the DOSM source lineage/reuse review is recorded and approved, set **Backend Preview** `DOSM_MARKET_RADAR_ENABLED=1` and redeploy Backend. Then set **Frontend Preview** `VITE_DOSM_MARKET_RADAR_ENABLED=true` and redeploy Frontend, because Vite embeds that flag at build time. Check `/api/v1/market/radar?period=2026-Q2` (200), period switching, attribution, dated labels, and that recommendations continue to use their separate role snapshot. Keep both flags off if approval is absent.
