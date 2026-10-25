# PR #47 — Real API Career Detail acceptance record

Date: 2026-10-25 (Asia/Bangkok). PR: [#47](https://github.com/Frank219wan/SyncEra/pull/47), branch `fix/real-career-detail-demo-parity-20261025`. Local synthetic QA began at `2112b97c29dbb2c1401be84cb9f1462f299103f6`. Protected cloud QA was performed against the exact deployed PR commit `cd44487eb6de4fc201756f8eafda2c0ca2daf23f`. The target `main` later advanced to `3a21303`; its translation changes and latest README were integrated on this PR. Cloud results below apply to `cd44487`, and any newer PR head requires a fresh Preview verification.

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

## Protected Preview configuration and security — PASS for deployed `cd44487`

The existing `frank219wan/syncera-frontend` project is `prj_tiNiv4Jgd6RUl5TqOM0YafawEMPy` (Vite, repository root). For the exact PR branch, the Preview environment has `VITE_API_MODE=real` and an exact HTTPS `BACKEND_PREVIEW_ORIGIN` of `https://syncera-backend-git-feature-organization-b1-hr-frank219wan.vercel.app` with no trailing slash. Both Config values were compared inside a local script without printing their contents. `BACKEND_PROTECTION_BYPASS_SECRET` is a branch-scoped, server-only Vercel Secret; its value was never requested. The accidental broad Preview duplicate was removed by the owner; a subsequent metadata check found zero unscoped copies. The browser build contains no `BACKEND_PROTECTION_BYPASS_SECRET` or `x-vercel-protection-bypass` string. No credential value was copied into Git, logs or this report.

The existing backend branch alias is protected and its Ready source SHA is `03be4abf23cb90954b88cefb736f15d7e1181020`. Authenticated backend `/api/v1/health` and `/openapi.json` returned HTTP 200 with the required contract routes. The frontend and backend projects both show Require Log In for their Preview deployments; anonymous root and health requests were challenged with HTTP 302 to Vercel SSO. No domain exceptions were shown. The frontend's **published active** WAF configuration was read through the active firewall API: `preview-api-rate-limit` is enabled for Preview `POST /api/v1/*`, 10 requests per 60 seconds per IP, with a rate-limit action. A separate draft change remains unpublished and was not applied. The proxy also enforces its own per-instance POST and GET limits; this backstop is not a global limit.

The existing protected PR deployment is `dpl_4cgwZ6vCeZEnYpiKeiHz9dwjS6Hk`, immutable URL `https://syncera-frontend-3zytig8qa-frank219wan.vercel.app/`, branch alias `https://syncera-frontend-git-fix-real-career-detail-34292d-frank219wan.vercel.app/`. Vercel reports Ready, Preview, and exact source SHA `cd44487eb6de4fc201756f8eafda2c0ca2daf23f`. This deployment was already present during the preflight; this QA did not create another deployment. Anonymous root and same-origin health returned an SSO challenge; authenticated same-origin `/api/v1/health` returned HTTP 200 and `data.status=ok`. No Production deployment or setting was changed by this QA.

## Protected cloud browser and FastAPI acceptance — `cd44487`

Only fictional form data was submitted. The free-text CV/experience field was left empty because the Preview adapter may call paid MiniMax for non-empty text; the form-only adapter path uses structured values and does not call it. The workflow completed Normalize → Confirm → Trends → Recommendations. Read-only Neon Preview verification located exactly one matching profile, `profile_cb93de88393342ca`, at revision 2, `reviewed_by_user=true`, psychology consent true, five scenario answers and two confirmed skills. No cleanup was performed.

| Check | Cloud result |
| --- | --- |
| Same-origin health | **PASS** — authenticated HTTP 200, `data.status=ok` |
| Career Matches | **PASS** — server-returned `role_data_analyst` and `role_business_analyst`; polished illustrated rank cards, strengths and gaps; no local Demo role cards |
| API/UI contract | **PASS** — direct authenticated same-origin POST returned profile ID and snapshot `snap_my_20261021_01`; Moderate scores 45.82/43.02 and Fast scores 47.07/42.51 for those role IDs, matching the UI |
| Scenario | **PASS** — Moderate → Fast → Moderate; old personal score and gaps disappeared while a new response was pending, then 45.82 → 47.07 → 45.82 displayed |
| Detail design and tabs | **PASS** — summary, scenario controls, fit/skills, X-Ray, evidence/impact and learning CTA displayed with real service content |
| X-Ray/evidence | **PASS after transient limit** — backend returned task `task_data_review`; X-Ray showed human-led oversight and uncertainty, and source record `Synthetic role-signal fixture` with explicit synthetic limitation. A rapid early source request returned HTTP 429; a later normal revisit recovered. This is consistent with the proxy's bounded GET rate limit, but that attribution was not proved from logs. |
| Learning path | **PASS** — Data Analyst draft showed 4 weeks, 20 estimated hours, two checkpoints, service feasibility and no invented course prices; Python skill map retained `role=data-analyst` and showed service-estimated nodes. The draft was not adopted. |
| Neon persistence | **PASS, read-only verification** — Preview branch profile metadata above; no real person or Production data |
| Demo fallback | **PASS for the tested path** — actual same-origin API responses and scores matched displayed data; synthetic fixture labels reflect backend data provenance, not frontend Demo Mode |
| Controlled 500/503/timeout, retry, stale revision | **NOT VERIFIED in cloud** — the local synthetic HTTP adapter covered 503 and retry. No shared Backend fault injection or disruptive rate-limit test was performed. |
| Unknown catalogue role | **PASS locally, NOT VERIFIED in cloud** — local adapter test kept server name and ID; the current backend did not return such a role. |

For 390×844 and 320×700, the authenticated Preview detail page was inspected in English, Simplified Chinese and Malay, each in light and dark mode: **12/12 combinations had `document.documentElement.scrollWidth === clientWidth`**. Representative actual browser screenshots were inspected in this QA session at 390px English light, 320px English light, 320px Chinese dark and 320px Malay dark. These transient Preview captures were not saved as repository files; the linked image files above remain **local adapter screenshots only**. The three tabs were checked in the cloud, and Enter activated a focused tab. The theme and language controls worked at both widths. Some server-supplied source text remains in English with provenance; it was not silently translated or invented.

The available Vercel runtime-log API returned no grouped records for this deployment in the latest 30-minute query. A wider query was rejected by Hobby retention. Therefore a complete historical log audit and direct request-header redaction review are **NOT VERIFIED**. The local public `dist` build had no bypass-secret identifier or bypass-header string; the Secret value was never read.

## Branch integration and test status

After cloud QA, `main` advanced with localization changes. The PR branch encountered three conflicts (`package.json`, `src/pages/ConnectedCareers.tsx`, `src/pages/Learning.tsx`). They were resolved locally by keeping PR #47's real detail design and incorporating `main`'s dynamic translations and both test files. The subsequent README-only `main` commit was also integrated. The merged source has **not** been deployed, so cloud PASS results above are restricted to `cd44487`. The final PR head and CI must be rechecked after the merge commit is pushed.

- `corepack pnpm test`: **148 passed, 0 failed** on the locally integrated source.
- `corepack pnpm exec tsc -b`: **PASS**.
- `corepack pnpm build`: **PASS**.
- `VITE_API_MODE=real corepack pnpm build`: **PASS**.
- GitHub CI on deployed `cd44487`: **6 successful checks**. CI for the integrated source: **PENDING** until pushed.

**Review status:** The deployed `cd44487` passes the tested protected Real API happy path, but the integrated PR head needs its own Preview deployment and browser smoke test before cloud acceptance can be assigned to it. Keep PR #47 Draft; do not merge based on the older deployment or local adapter evidence alone.
