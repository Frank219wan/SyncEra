# Organization B1/B2 protected Preview — final failure gates (2026-10-24)

Status: **BLOCKED**. This report covers the last three requested gates; it does not replace the earlier successful Neon, SSO, WAF, CAS, and primary Cloud E2E evidence in `ORGANIZATION_B1_B2_CLOUD_ACCEPTANCE.md`. No migration, WAF load test, or merge was performed in this run.

## Version and scope

| Item | Verified value |
| --- | --- |
| `origin/feature/organization-mvp` (#36) | `17b75f16ac64336909c0743aa0262eb52a05ff47` |
| `origin/feature/organization-b1-hr` (#37) at start | `428439ff06209fa42a20463c5654b392aeca43b0` (the supplied `144e3d3…` was superseded by test-only commits) |
| PR #37 after the repair and first report | `935ac9becb0a499ea0ddcc284f98c9b15efdde1a`; GitHub `integrated` CI completed successfully for this exact SHA |
| Frontend protected branch Alias | `syncera-frontend-git-feature-organization-b1-hr-frank219wan.vercel.app` → `dpl_BiSToeVKKhREM1w3mNGvYtzTYV9K`, Preview, Ready |
| Backend protected branch Alias | `syncera-backend-git-feature-organization-b1-hr-frank219wan.vercel.app` → `dpl_B9Tsb5MVCaranbQWzuzMFjNReoHj`, Preview, Ready |
| Both deployment Git source SHAs | `d76afe947787bd0cd0a7b1747159cb00f3b112f4`, independently read from Vercel deployment metadata |
| Deployment configuration | Both inspected builds retain `git.deploymentEnabled=false` |

## Browser and Backend failure gates

| Gate | Result | Evidence and limit |
| --- | --- | --- |
| B1/B2 HTTP 500 interception | **PASS for error display; B1 Retry FAIL** | `page.route()` returned a synthetic 500 on the exact analysis API path. Each click made one request; both showed the injected error. B1 `Try again` cleared the error without a new request on deployed SHA `d76afe9…`. |
| B1/B2 timeout interception | **PASS for error display** | The browser held the matching API request until the frontend's 20-second timeout; both showed the timeout error and Retry control. No automatic retry loop was seen. |
| B1/B2 network abort interception | **PASS for error display** | `route.abort('failed')` on the matching API request showed the network error and Retry control in both modes. |
| Recovery and Retry | **B2 PASS; B1 Retry FAIL on deployed SHA** | B2 `Try again` made one new API call and reached genuine server HTTP 200. B1's `Try again` made zero calls; manually choosing `Review department plan` then reached genuine HTTP 200. The B1 repair is on PR #37 but not deployed. |
| B1/B2 no Demo fallback under these failures | **PASS for tested browser paths** | B1 dashboard displayed `Current HR analysis required`; B2 displayed `Current student analysis required`. No old recommendation or connected snapshot appeared after failure. |
| Stale analysis and CAS token safety under these failures | **PARTIAL** | After editing the B1 Revision, a synthetic 500 left workspace ID, workspace Revision and local Revision unchanged; old analysis stayed hidden. After B2 Moderate→Fast and synthetic 500, the same metadata remained unchanged, and old role, Snapshot and Workshop view were hidden. A late successful B1 response during an in-flight edit was not tested against the repaired SHA. |
| Actual Backend failure | **NOT VERIFIED** | No separate protected, disposable fault-injection Backend was available. The shared Preview was not disrupted. A browser mock or HTTP 409 is not counted as an actual Backend failure. |

Browser assertions ran at `https://syncera-frontend-git-feature-organization-b1-hr-frank219wan.vercel.app` between 2026-10-24 03:39 and 03:48 UTC. Vercel metadata still mapped that alias to Frontend source `d76afe947787bd0cd0a7b1747159cb00f3b112f4`. A fresh ephemeral Playwright Chrome context completed interactive Vercel SSO; only the authentication Cookie **name** was inspected. Route handlers matched only `/api/v1/organizations/hr/analyze` and `/api/v1/organizations/career_centre/analyze`. They never targeted Production or an arbitrary URL. Browser assertions checked UI error text, one request per click, empty states, stale Snapshot and recommendation absence, and CAS metadata without printing the synthetic request bodies. No token or Cookie value was printed or saved. The automatic approval review had earlier rejected `vercel env pull` because it would copy the entire development environment; it was not run, and no equivalent broad environment read was attempted.

The two genuine recovery calls used fictional fixture data and created Preview workspaces `org_b839a8d658784e30` (B1) and `org_12cee99739d843f0` (B2). The latter was reanalyzed for Fast and reached server workspace Revision 2. After separate explicit user authorization, a `verify-full` Preview connection checked both workspace IDs, exact mode and Revision, synthetic fixture labels, review flag and creation window. It found three analysis rows and no related plan/call rows. A second checked write connection deleted exactly those three analyses and two workspaces in one transaction; readback confirmed both IDs absent. No migration or Schema change was made. Browser-injected 500, timeout, and abort did **not** reach the Backend and must not be counted as actual Backend failures.

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

After browser testing, a second accessible ten-minute window (Frontend 03:38:46–03:48:46 UTC; Backend 03:38:51–03:48:51 UTC) returned 153 Frontend and 4 Backend request entries, still zero Runtime Log entries. Exactly three genuine organization-analysis requests returned HTTP 200 in each deployment's request log: HR at 03:43:46 and B2 at 03:46:39 and 03:47:48 UTC. One example Frontend/Backend Request ID pair is `5mmlc-1792813668045-f726136389e8` / `hhqnd-1792813668190-9999fea30ea7` for the final B2 call. Injected browser failures generated no Backend log entry, as expected. No Secret-pattern match appeared in these accessible request entries. Because there were **zero Runtime Log entries** and older windows were unavailable, Function error logging and historical Secret redaction remain **NOT VERIFIED**. The deployment owner must decide whether this observability gap is acceptable; it is not evidence of a clean full history.

## Reviewer and release decision

An independent code-review agent found the B1 issue above but could not submit a formal GitHub Review because its session ended at a usage limit. No independent GitHub Approval is claimed. A reviewer must inspect the repaired PR SHA and submit an actual GitHub Review before merge.

**Operational incident:** A Vercel CLI `env run` command was misinterpreted as an initial deployment and created a separate empty project named `syncera-check-oidc`, deployment `dpl_7tVW8HyzCUau6jeZaWq1BnapPVEC`, marked Production. This was not the existing SyncEra Frontend or Backend project, but it violated the instruction not to touch Production. The command path was stopped immediately. After the user explicitly authorized deletion, project ID `prj_SZkZxEIX5lkmzJqf87vsrOkUghhP` was checked by name and deleted; a second lookup returned `project_not_found`. Therefore `PRODUCTION UNCHANGED` for this run is **NO** despite cleanup. No SyncEra Production project, `main`, Production environment variable, or Production database was intentionally changed.

**Protected Preview accepted: NO. Ready to merge #36: NO. Ready to merge #37: NO.** Required next steps: deploy the tested B1 repair SHA to the protected Preview and repeat its Retry plus late-response CAS race tests; use a separate protected and disposable Backend for real fault injection if one can be provisioned safely; obtain formal independent Review; and have the deployment owner explicitly accept any irrecoverable log-history gap.
