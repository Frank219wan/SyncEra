# PR #47 — Real API Career Detail acceptance record

Date: 2026-10-25 (Asia/Bangkok). PR: [#47](https://github.com/Frank219wan/SyncEra/pull/47), branch `fix/real-career-detail-demo-parity-20261025`. QA started from `963836a6a08f8048ad8a703ca0b90a176ada0c9a`. **No PR #47 Vercel deployment was made; deployment ID, URL and deployed source SHA are N/A.**

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

The existing frontend project `frank219wan/syncera-frontend` has ID `prj_tiNiv4Jgd6RUl5TqOM0YafawEMPy`, Root Directory `.`, and Vite framework. Its Deployment Protection has **Require Log In** selected for pre-production deployments. The existing backend project's Deployment Protection also has **Require Log In** selected. The frontend WAF rule `preview-api-rate-limit` is checked and configured for Preview `/api/v1/` POST traffic at 10 requests/60 seconds/IP with 429 action; the dashboard also shows one unpublished staged firewall change, so the published rule state was not re-proven by live traffic in this run.

The frontend environment-variable list has the required entries only for other named branches (`feature/organization-b1-hr`, `fix/real-career-matches-ui-20261025`, `integration/career-radar-dosm-pr15`) or Production. It shows **none scoped to `fix/real-career-detail-demo-parity-20261025`**, and no linked shared variables. Therefore `VITE_API_MODE=real`, `BACKEND_PREVIEW_ORIGIN`, and server-only `BACKEND_PROTECTION_BYPASS_SECRET` are **not verified as available to this branch**. No values or secrets were viewed or copied. In accordance with the PR task's fail-closed preflight, the PR branch was **not deployed**. The previously working protected Preview was left unchanged.

| Cloud check | Status and reason |
| --- | --- |
| Protected PR #47 deployment and `/api/v1/health` | BLOCKED — target branch Preview variables absent |
| Real FastAPI Career Matches/Detail, Moderate/Fast, skill map and roadmap | BLOCKED — no PR #47 deployment |
| No stale data or Demo fallback in cloud | NOT VERIFIED — local synthetic failure test only |
| Frontend/Backend Authentication | PASS for dashboard setting preflight; no new deployment to test |
| Frontend WAF on new deployment | NOT VERIFIED — no deployment; staged change not published here |
| Neon persistence and paid AI | NOT TESTED; no database or paid AI calls made |

## Code and test result

- `corepack pnpm test`: **144 passed, 0 failed**.
- `corepack pnpm exec tsc -b`: **PASS**.
- `corepack pnpm build`: **PASS**.
- `VITE_API_MODE=real corepack pnpm build`: **PASS**.
- GitHub integrated CI: check the final PR head in GitHub; this local report does not substitute for CI.

The small QA fixes adjust 320px navigation/breadcrumb wrapping, dark SDG contrast, and preserve an unknown server role's name and ID in the learning-plan header and skill-map links. They do not change the recommendation validator, API contract, backend, scoring, Neon, Production, or deployment protection.

## Remaining acceptance work

An authorized owner must scope the three existing approved Preview values to this exact PR branch, verifying the backend origin and keeping the bypass secret server-only. After a separate protected Preview deployment of the reviewed SHA, verify actual FastAPI requests and responses, scenario changes, skills, X-Ray, evidence, roadmap, stale-result handling, and absence of Demo fallback. Keep PR #47 Draft and do not merge on the basis of this local adapter evidence alone.
