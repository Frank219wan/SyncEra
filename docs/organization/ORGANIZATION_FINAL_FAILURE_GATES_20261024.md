# Organization B1/B2 protected Preview — final failure gates (2026-10-24)

Status: **BLOCKED**. This report covers the last three requested gates; it does not replace the earlier successful Neon, SSO, WAF, CAS, and primary Cloud E2E evidence in `ORGANIZATION_B1_B2_CLOUD_ACCEPTANCE.md`. No migration, WAF load test, or merge was performed in this run.

## Version and scope

| Item | Verified value |
| --- | --- |
| `origin/feature/organization-mvp` (#36) | `17b75f16ac64336909c0743aa0262eb52a05ff47` |
| `origin/feature/organization-b1-hr` (#37) at start | `428439ff06209fa42a20463c5654b392aeca43b0` (the supplied `144e3d3…` was superseded by test-only commits) |
| Frontend protected branch Alias | `syncera-frontend-git-feature-organization-b1-hr-frank219wan.vercel.app` → `dpl_BiSToeVKKhREM1w3mNGvYtzTYV9K`, Preview, Ready |
| Backend protected branch Alias | `syncera-backend-git-feature-organization-b1-hr-frank219wan.vercel.app` → `dpl_B9Tsb5MVCaranbQWzuzMFjNReoHj`, Preview, Ready |
| Both deployment Git source SHAs | `d76afe947787bd0cd0a7b1747159cb00f3b112f4`, independently read from Vercel deployment metadata |
| Deployment configuration | Both inspected builds retain `git.deploymentEnabled=false` |

## Browser and Backend failure gates

| Gate | Result | Evidence and limit |
| --- | --- | --- |
| B1/B2 HTTP 500 interception | **NOT VERIFIED** | No browser `page.route()` test reached the protected Preview. No actual 500 was generated. |
| B1/B2 timeout interception | **NOT VERIFIED** | No controlled browser timeout was generated. |
| B1/B2 network abort interception | **NOT VERIFIED** | No controlled browser abort was generated. |
| Recovery and Retry | **NOT VERIFIED IN CLOUD** | Earlier current-analysis UI paths passed, but this does not prove recovery from 500, timeout, or abort. |
| B1/B2 no Demo fallback under these failures | **NOT VERIFIED** | Real-mode no-analysis and 409 paths passed earlier; the requested failure paths did not run. |
| Stale analysis and CAS token safety under these failures | **NOT VERIFIED IN CLOUD** | A new B1 asynchronous-response identity gap was found in code review and fixed locally; the fix has not been deployed. |
| Actual Backend failure | **NOT VERIFIED** | No separate protected, disposable fault-injection Backend was available. The shared Preview was not disrupted. A browser mock or HTTP 409 is not counted as an actual Backend failure. |

The available browser-control interface did not expose request interception. A proposed way to obtain a short-lived browser OIDC token via `vercel env pull` was rejected by automatic approval review because it would copy the Frontend project's entire development environment, potentially including sensitive credentials, beyond this task's necessary scope. It was **not** run. A narrowly scoped authentication path requires separate authorization. No request body, personal record, or Secret was printed.

## B1 code-review blocker and local repair

Independent code inspection identified that the deployed B1 `HRIntake.reviewPlan()` accepted a late response without checking the current workspace ID, local Revision, or Scenario before updating the CAS token and visible analysis. Its error card's Retry action only cleared the error. This is a real merge blocker even though the B2 path had an identity guard.

Repair commit `38e1d18cb95cbfc4e34624bd6ef2f08ba159870e` adds a B1 response guard that retains the committed CAS token only for the same known workspace, hides an analysis if Revision or Scenario changed, rejects another known workspace, and makes Retry start a new analysis. Regression tests cover current, stale, and other-workspace responses. **This commit is not the deployed Preview SHA.** An initial workspace without a server ID still needs cloud race-path verification before the CAS gate can be accepted.

Local sanitized-environment checks on the repaired branch: Frontend `100/100` passed; TypeScript `tsc -b` passed; Real-mode production build passed; Backend `164 passed, 4 skipped` (database-backed tests deliberately skipped); `git diff --check` passed. The frontend dependency copy produced a pnpm virtual-store warning; no lockfile or dependency manifest changed. These tests do not replace protected Cloud failure-path testing.

## Function logs and Secret redaction

Only a bounded recent window was accessible. Vercel CLI returned retention/availability errors for both projects with `--since 1h` and `--since 8h`. For the exact UTC windows below, `--since 10m` returned no Runtime Log entries and one Health request per deployment:

| Project | Accessible UTC window | Runtime entries | Request evidence |
| --- | --- | ---: | --- |
| Frontend | 2026-10-24 03:04:05–03:14:05 | 0 | `GET /api/v1/health` 200 at 03:11:47.769, Request ID `6c65n-1792811507769-acde6cfd8858` |
| Backend | 2026-10-24 03:04:10–03:14:10 | 0 | `GET /api/v1/health` 200 at 03:11:48.505, Request ID `b2pcm-1792811508505-e5813404d9ab` |

No HTTP 500 or timeout request was present in that narrow available window. No Secret-pattern match appeared in the two accessible request records. Because there were **zero Runtime Log entries** and older windows were unavailable, Function error logging and historical Secret redaction remain **NOT VERIFIED**. The deployment owner must decide whether this observability gap is acceptable; it is not evidence of a clean full history.

## Reviewer and release decision

An independent code-review agent found the B1 issue above but could not submit a formal GitHub Review because its session ended at a usage limit. No independent GitHub Approval is claimed. A reviewer must inspect the repaired PR SHA and submit an actual GitHub Review before merge.

**Operational incident:** A Vercel CLI `env run` command was misinterpreted as an initial deployment and created a separate empty project named `syncera-check-oidc`, deployment `dpl_7tVW8HyzCUau6jeZaWq1BnapPVEC`, marked Production. This was not the existing SyncEra Frontend or Backend project, but it violated the instruction not to touch Production. The command path was stopped immediately. After the user explicitly authorized deletion, project ID `prj_SZkZxEIX5lkmzJqf87vsrOkUghhP` was checked by name and deleted; a second lookup returned `project_not_found`. Therefore `PRODUCTION UNCHANGED` for this run is **NO** despite cleanup. No SyncEra Production project, `main`, Production environment variable, or Production database was intentionally changed.

**Protected Preview accepted: NO. Ready to merge #36: NO. Ready to merge #37: NO.** Required next steps: obtain a scoped protected-browser testing method; perform B1/B2 500, timeout, abort, and recovery checks against a compatible Preview build; use a separate protected and disposable Backend for real fault injection if one can be provisioned safely; obtain formal independent Review; and have the deployment owner explicitly accept any irrecoverable log-history gap.
