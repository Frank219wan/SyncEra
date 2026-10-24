# SyncEra — Independent QA After B1 Lock Lifecycle Fix

## Verdict

| Item | Result |
|---|---|
| Reviewed PR #37 SHA | `a0822cd4651ba8903815a4e005acf9f4ca914cb6` |
| Previous lifecycle result | 2/6 passed; 4/6 failed |
| Current core lifecycle result | **6/6 passed** |
| Extended same-context browser result | **12/12 passed** |
| Existing + retained multi-tab unit suite | **16/16 passed** |
| Standard frontend suite | **136/136 passed** |
| Backend offline suite | **164 passed, 4 skipped** |
| Local cross-stack | **4/4 passed** |
| TypeScript | **PASS** |
| Real-mode Vite build | **PASS** |
| Cloud / Neon / Vercel / Production | **NOT USED** |

The four previously failing lifecycle behaviors are no longer reproduced at the reviewed SHA. Home, Individual and B2 do not claim the B1 lock. Leaving an idle B1 work route releases it. Pending analysis keeps it until the result is safely handled, while close/reload releases the browser lock and restores the UI to fail-closed Unknown recovery. Two B1 tabs never become active editors at the same time.

## Independent environment

- Independent clone: `D:\codex\2026SDGhackthon\SyncEra-organization-lock-lifecycle-qa-a0822cd`
- QA branch: `qa/organization-lock-lifecycle-retest-a0822cd`
- Source comparison: `85a3a4451d300eca558ea1bcee57fae3a405ee68..a0822cd4651ba8903815a4e005acf9f4ca914cb6`
- Source changes: `6d09a0b Limit B1 editor lock to HR work routes` and `a0822cd Defer B1 analysis until new workspace identity commits`.
- The remote advanced from `6d09a0b` to `a0822cd` during QA. The QA-only changes were preserved, rebased by clean cherry-pick onto a fresh worktree, and the browser and complete offline regression suites were rerun at the final reviewed SHA.
- Node.js `v22.22.2`; pnpm `11.25.0`; Python `3.13.7`
- Browser: local headless `Chrome/155.0.8059.85`
- Browser origin: `http://127.0.0.1:5179`
- Each browser scenario used one isolated Browser Context and multiple same-origin Pages/Tabs sharing LocalStorage and Web Locks.
- Real API mode was used only with a local Vite server. The B1 analysis request was intercepted locally and returned controlled synthetic failure data. No external API was called.
- Backend tests used no `DATABASE_URL`, `TEST_DATABASE_URL` or provider key. PostgreSQL tests were intentionally skipped.

## Required behavior results

| Check | Evidence | Result |
|---|---|---|
| Home lock | Home had zero held and zero pending `futureproof-b1-editor-v1` locks. | **PASS** |
| Individual lock | SPA navigation to `/individual` still had zero B1 locks. | **PASS** |
| B2 lock | `/organization/tvet/students` still had zero B1 locks. | **PASS** |
| B1 navigation release | B1 acquired one lock; B1 → Home and B1 → Individual released it. | **PASS** |
| B1 → Home → B1 | The same tab released then safely reacquired the B1 lock. | **PASS** |
| B1 tab close | Closing the owning B1 tab released or safely transferred the lock; explicit retry worked when required. | **PASS** |
| Tab A Home / Tab B B1 | The B1 tab remained editable; Home did not queue another lock. | **PASS** |
| Tab A B1 / Tab B B1 | Exactly one lock was held; the second B1 tab displayed the read-only blocker. | **PASS** |
| Pending navigation | Leaving B1 during a held request kept the lock. A second B1 tab remained blocked until the result became safely persisted Unknown recovery. | **PASS** |
| Pending close | Closing the pending owner released the browser lock. The surviving B1 tab rendered the restored state as Unknown and could safely reacquire. | **PASS** |
| Pending reload | Reload released/reacquired the browser lock and rendered Unknown recovery, not “request still running.” | **PASS** |
| React StrictMode | Initial mount replay and later B1 re-entry converged to one active editor without a permanent blocker. | **PASS** |

### Pending serialization note

On forced tab close/reload, the raw canonical LocalStorage record may retain the `pending` sentinel because a browser does not guarantee React cleanup execution during document termination. On the next read, production `restoreHr()` converts that sentinel to `unknown` before the state is usable. The browser assertions checked the visible recovery behavior, absence of automatic resubmission, and Web Lock release/reacquisition. This is fail-closed and matches the existing unit contract; it is not evidence of a confirmed server revision.

## B2 and Individual regression

- The existing behavior suite confirms that a blocked B1 tab cannot overwrite newer B2 or Individual state.
- B2 and Individual persistence remains writable when B1 is inactive or blocked.
- B2 Real/Demo, revision and scenario view gates remained unchanged.
- Standard frontend tests covering Profile Wizard, Start New Profile, local persistence, B2 mapping and Organization views all passed.

Result: **PASS**.

## GREEN patch review

Reviewed patch:

- Path: `D:\codex\2026SDGhackthon\0001-test-organization-verify-multi-tab-CAS-coordination.patch`
- Supplied commit: `bc7058de5e1e4e6318e4bbf5a553e3e636093895`
- Verified SHA-256: `339614E7C362612F5CA4E28F56A2001891693729ACEE3C6D3B6B167C7D08566F`

The full patch was not applied because most cases duplicate the expanded `tests/multitab-persistence.test.ts` now present in PR #37. The old report also targets SHA `85a3a44`, and its final test uses source-string matching plus a hard-coded `FIX_SHA`; those assertions were not retained.

Only three genuinely additional behavior checks were integrated into the existing CI-run test file:

1. Both concurrent stale/confirmed write orders preserve Revision 3.
2. A late HTTP 200 preserves newer local input and hides stale analysis.
3. A late first-workspace response cannot bind to a replacement workspace.

No source-string assertion, fixed commit assertion, deployment assertion, or core business code was added.

## Commands and results

| Command / check | Result |
|---|---|
| `node tests/organization-lock-lifecycle-browser-qa.mjs` | **PASS — 12/12 browser checks** |
| `node --experimental-strip-types --test tests/multitab-persistence.test.ts` | **PASS — 16/16** |
| `pnpm test` | **PASS — 136/136** |
| `pnpm exec tsc -b` | **PASS** |
| `VITE_API_MODE=real pnpm build` | **PASS** |
| Backend `python -m pytest tests -q -rs` | **PASS — 164 passed, 4 skipped** |
| Local `tests/cross-stack.test.ts` with localhost FastAPI and temporary SQLite | **PASS — 4/4** |
| `git diff --check` | **PASS** |

Backend skips were expected and preserved: one Organization PostgreSQL suite, one reviewed Preview PostgreSQL HTTP suite and two general PostgreSQL integration tests require `TEST_DATABASE_URL`. No real database was supplied merely to remove skips.

## Remaining acceptance boundaries

- No scoped P0/P1 lock-lifecycle defect was found in local Chrome.
- Firefox and WebKit multi-tab behavior is **NOT VERIFIED**.
- Protected Preview retest is still required before cloud acceptance.
- Neon CAS, Vercel routing and Production are **NOT VERIFIED in this run**.
- Python 3.12 is **NOT VERIFIED** on this machine; backend tests passed on Python 3.13.7.

## Files changed by independent QA

- `tests/multitab-persistence.test.ts` — three non-duplicate behavior tests.
- `tests/organization-lock-lifecycle-browser-qa.mjs` — dependency-free local Chrome/CDP multi-tab harness.
- `docs/organization/B1_LOCK_LIFECYCLE_INDEPENDENT_QA_20261024.md` — this report.

No application source, Backend source, migration, deployment configuration, shared PR branch or Production resource was modified.
