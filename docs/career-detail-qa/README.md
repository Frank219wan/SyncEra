# PR #47 — Real API Career Detail acceptance record

Date: 2026-10-25 (Asia/Bangkok). PR: [#47](https://github.com/Frank219wan/SyncEra/pull/47), branch `fix/real-career-detail-demo-parity-20261025`. The application source verified before this report update was `2112b97c29dbb2c1401be84cb9f1462f299103f6` (QA started from `963836a6a08f8048ad8a703ca0b90a176ada0c9a`). **No PR #47 Vercel deployment was made; deployment ID, URL and deployed source SHA are N/A.** The report-only commit SHA and CI outcome must be checked on the final PR head.

## Local browser evidence — PASS with a synthetic HTTP adapter

The Vite app ran with `VITE_API_MODE=real` and a local deterministic synthetic HTTP adapter. This is a browser/HTTP layout and state test, **not** protected Preview or FastAPI/Neon acceptance. The role, scores, snapshot, task and evidence below were synthetic fixture values.

| Check | Actual result |
| --- | --- |
| Exact viewport | 390×844 and 320×700; device scale factor 1, `innerWidth` 390/320 and `document.documentElement.scrollWidth` 390/320 |
| Languages/themes/tabs | 2 widths × English/Chinese/Malay × light/dark × fit/X-Ray/evidence = 36 inspected states; no document overflow or clipped interactive control after the mobile shell fix |
| Keyboard | Tab moved focus between detail tabs and Enter activated the focused tab at 320px |
| Scenario | Moderate 69.5 → Fast 67.5 → Moderate 69.5 from synthetic HTTP responses; selected score and content updated |
| Failure/retry | Synthetic 503 hid the prior score and strengths/gaps, showed an error and retry, and did not show Demo role cards; retry restored the response |
| Unknown catalogue role | `Synthetic Systems Steward` rendered with its server-style name and `synthetic-steward` role ID; learning-plan heading/back link and skill-map role query retained that identity |
| Layout fix | At 320px, main navigation and breadcrumbs wrap without clipping; in dark mode the SDG badge has readable contrast |

Screenshots, all from the **local synthetic adapter**:

- [390px English light, fit and skills](mobile-390-en-light.jpg)
- [320px English light, fit and skills](mobile-320-en-light.jpg)
- [390px Chinese dark, AI Task X-Ray](mobile-390-zh-dark-xray.jpg)
- [320px Malay dark, evidence and impact](mobile-320-ms-dark-evidence.jpg)
- [Desktop before](real-before.jpg), [desktop after light](real-after.jpg), [desktop after dark](real-after-dark.jpg) from the initial PR implementation

## Protected Preview preflight — BLOCKED

The existing frontend project `frank219wan/syncera-frontend` has ID `prj_tiNiv4Jgd6RUl5TqOM0YafawEMPy`, Root Directory `.`, and Vite framework. Its Deployment Protection has **Require Log In** selected for pre-production deployments. The backend project's Deployment Protection has **Require Log In** selected for all deployments. There are no domain exceptions listed in either project's Deployment Protection page. Anonymous requests to the **existing** frontend branch Preview root and same-origin `/api/v1/health`, and to the backend branch Preview `/api/v1/health`, returned HTTP 302 to Vercel SSO. This does not substitute for the same checks on a new PR #47 deployment.

The frontend firewall reports one active custom rule and one draft change. The dashboard's current draft of `preview-api-rate-limit` targets Preview `/api/v1/` POST traffic at 10 requests/60 seconds/IP with a 429 action. The audit log shows a previously published version #4 and a later unpublished modification. The exact **published** rule conditions and action were not independently retrieved; no WAF traffic test or publication was performed. Published-rule precision and behavior remain **NOT VERIFIED**.

The frontend environment-variable list has the required entries only for other named Preview branches (`feature/organization-b1-hr`, `fix/real-career-matches-ui-20261025` for the two non-secret variables, and `integration/career-radar-dosm-pr15`) or Production. It shows **none scoped to `fix/real-career-detail-demo-parity-20261025`**, and no linked shared variables. Therefore `VITE_API_MODE=real`, `BACKEND_PREVIEW_ORIGIN`, and server-only `BACKEND_PROTECTION_BYPASS_SECRET` are **not available to this branch according to the project settings**. The existing bypass variable is a write-only Secret; its value could not be safely copied or verified by the tester. No values or secrets were viewed, copied, logged, or committed. In accordance with the PR task's fail-closed preflight, the PR branch was **not deployed**. The previously working protected Preview was left unchanged.

The existing protected backend branch alias is `https://syncera-backend-git-feature-organization-b1-hr-frank219wan.vercel.app`. Its Ready deployment ID is `CDwYtNHaM1o2AsevvYAUGtsYRjna`, source SHA `03be4abf23cb90954b88cefb736f15d7e1181020`. Authenticated, read-only requests to its `/api/v1/health` returned HTTP 200 with `data.status=ok`; `/openapi.json` returned HTTP 200 and lists the expected health, normalize, confirm, recommendations and roadmap methods. This establishes endpoint availability, **not** PR #47 end-to-end contract compatibility. The existing frontend branch alias's same-origin health also returned HTTP 200 with `data.status=ok`. The frontend proxy's allowlist includes the backend branch alias exactly; the backend deployment-specific hostname is not an allowed `BACKEND_PREVIEW_ORIGIN`.

| Cloud check | Status and reason |
| --- | --- |
| Protected PR #47 deployment, deployment ID/SHA/URL and same-origin `/api/v1/health` | BLOCKED — target branch Preview variables absent; no PR deployment exists |
| Real FastAPI Career Matches/Detail, Moderate/Fast, skill map and roadmap | BLOCKED — no PR #47 deployment |
| No stale data or Demo fallback in cloud | NOT VERIFIED — local synthetic failure test only |
| Existing backend and frontend branch-alias health | PASS — authenticated HTTP 200, `data.status=ok`; independent of PR #47 |
| Frontend/Backend Authentication | PASS for existing settings and anonymous 302 SSO challenge; new deployment NOT VERIFIED |
| Published frontend WAF configuration and new-deployment behavior | NOT VERIFIED — one active rule, one draft modification; exact published rule not retrieved |
| Browser bundle/Network/log secret redaction on PR #47 deployment | NOT VERIFIED — no PR deployment |
| Neon persistence and paid AI | NOT TESTED; no database or paid AI calls made |

## Code and test result

- `corepack pnpm test`: **144 passed, 0 failed**.
- `corepack pnpm exec tsc -b`: **PASS**.
- `corepack pnpm build`: **PASS**.
- `VITE_API_MODE=real corepack pnpm build`: **PASS**.
- GitHub integrated CI at application SHA `2112b97c29dbb2c1401be84cb9f1462f299103f6`: **4/4 PASS** (cross-stack integrated, frontend tests/build, backend tests, Individual live API contract). Check CI again on the final report-only PR head.

The small QA fixes adjust 320px navigation/breadcrumb wrapping, dark SDG contrast, and preserve an unknown server role's name and ID in the learning-plan header and skill-map links. They do not change the recommendation validator, API contract, backend, scoring, Neon, Production, or deployment protection.

## Remaining acceptance work

An authorized owner must add the following to **syncera-frontend → Settings → Environment Variables** for **Preview branch `fix/real-career-detail-demo-parity-20261025` only**:

1. `VITE_API_MODE` as Config, value `real`.
2. `BACKEND_PREVIEW_ORIGIN` as Config, value exactly `https://syncera-backend-git-feature-organization-b1-hr-frank219wan.vercel.app` with no trailing slash or path, after confirming this is the approved backend target.
3. `BACKEND_PROTECTION_BYPASS_SECRET` as server-side Secret, entered directly from the owner's approved Preview credential source; never as `VITE_*`, in GitHub, or in chat. The existing Vercel Secret is write-only and was not copied or rotated.

Preserve the other branch scopes. Once effective branch configuration, published WAF policy, and a new protected Preview deployment authorization are confirmed, deploy the reviewed final PR SHA and verify actual FastAPI requests and responses, scenario changes, skills, X-Ray, evidence, roadmap, stale-result handling, and absence of Demo fallback. Keep PR #47 Draft and do not merge on the basis of this local adapter evidence alone.
