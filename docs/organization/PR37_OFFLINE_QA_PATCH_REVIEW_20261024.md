# PR #37 Offline QA patch review — 2026-10-24

## Baseline and scope

- Repository: `Frank219wan/SyncEra`.
- Fetched PR #37 HEAD: `8e6b1ecc008e9c6d2de240f640e2766da352b286` (direct child of the previously supplied `d76afe947787bd0cd0a7b1747159cb00f3b112f4`).
- Review branch: `review/organization-pr37-offline-qa-20261024`.
- Teammate patch base: `9fd70a57c41b0a2d3c2907673a21faab57442340`.
- The four patch commits were inspected as patch text: `7030d88` tests, `fc09bf1` report, `2bda501` B2 page fix and test update, `2d630e2` report update. The patch was not applied or replayed.
- No application source file was changed in this review branch.

## Current frontend findings

| Item | Finding | Evidence |
| --- | --- | --- |
| ORG-FE-001 | Resolved on current PR HEAD | `studentAnalysisView()` returns `needs_analysis` in Real mode without a current `career_centre` result. Trends, Gaps and Insights render a current-analysis-required empty state instead of local result branches. Demo remains explicit. |
| ORG-FE-002 | Resolved on current PR HEAD | The view requires matching mode, local revision and scenario. Connected student and cohort components are gated by that view. |
| Async response safety | Preserved on current PR HEAD | `OrganizationPages` records the requested revision, scenario and workspace ID. `applyStudentAnalysisResponse()` refuses another workspace identity; a stale response retains committed CAS identity while hiding its result. `hr-state.test.ts` covers a local edit, scenario change and workspace switch. |

The teammate's `src/hrState.ts` and `src/pages/Organization.tsx` changes cover the first two gates, but current PR #37 already contains those gates plus response identity handling. Replaying patch commit 3 would overwrite newer code. The patch report also describes the earlier `9fd70a5` baseline, so its pass counts are historical rather than evidence for this branch.

## Backend coverage comparison

| Teammate case | Existing coverage at PR HEAD | Review action |
| --- | --- | --- |
| 1. OpenAPI mode route, request and error responses | Route existence only in `test_api.py` | Added operation parameter, schema and response checks. |
| 2. B1 department-only and empty-skill unknown baseline | Both paths in `test_organization.py` | Skipped duplicate. |
| 3. B1 60/25/15 scoring and scenario change | Formula and score change in `test_organization.py` | Skipped duplicate. |
| 4. Forbidden HR narrative and protected fields rejected before scoring | No direct rejection test | Added one test checking four fields individually, with scoring patched to fail if called. |
| 5. Synthetic training hours and unassessed budget | Budget only in backend test; frontend mapper fixture has synthetic hours | Added backend response assertions for hours, estimate basis, budget and review status. |
| 6. B2 recommendation, gaps, action plan, cohort and human review | Modules and plan in `test_organization.py` | Added student and cohort human review assertions to existing flow test. |
| 7. B2 distinct formula and scenario baseline isolation | Formula and changed score in `test_organization.py` | Added check against B1 formula, stable baseline components and stable gaps. |
| 8. B1/B2 stale and cross-mode CAS, invalid workspace ID | Stale and cross-mode covered | Added invalid ID validation test only. |
| 9. Concurrent in-memory CAS | PostgreSQL concurrency exists but is skipped offline | Added in-memory concurrent update test: exactly one 200 and one 409. |

Result: five new backend tests and stronger assertions in two existing tests; no duplicate fixture file.

## Frontend coverage comparison

| Teammate case | Existing coverage at PR HEAD | Review action |
| --- | --- | --- |
| 1. B1 employee field exclusion | `api-contract.test.ts` checks notes and traits absence | Added exact employee field whitelist, including aspiration. |
| 2. B1/B2 request isolation | Separate mapper tests exist | Added exact top-level payload shapes for both modes. |
| 3. B1 connected result expiry and Demo | `hr-state.test.ts` covers all states | Skipped duplicate. |
| 4. API service does not catch failures and return Demo | Current service forwards request errors; teammate uses a source-text regex | Skipped brittle implementation-text assertion. |
| 5. Real B2 without analysis, Demo explicit | `organization-student-view.test.ts` covers ORG-FE-001 | Skipped duplicate. |
| 6. Mode, revision and scenario gate | `organization-student-view.test.ts` covers ORG-FE-002 and HR mode rejection | Skipped duplicate. |

Result: two new frontend tests in the existing test command. The teammate's source regex assertions were not copied because the current behavior is checked by state tests and local HTTP tests.

## Offline regression results

All commands ran from the Review worktree. Database and provider environment variables were unset; the local HTTP server used an in-memory organization repository and a temporary SQLite profile store on `127.0.0.1:18037`.

| Check | Result |
| --- | --- |
| `pnpm test` | 98 passed |
| `pnpm exec tsc -b` | Passed |
| `pnpm build` | Passed |
| Backend `pytest tests -q` | 164 passed, 4 skipped (database-backed tests require `TEST_DATABASE_URL`) |
| `tests/cross-stack.test.ts` against local HTTP server | 4 passed |
| `git diff --check` | Passed |

The Review worktree used a local copy of the already installed pnpm dependencies because the offline package store lacked one font tarball. No remote service, database migration or paid model was used.
