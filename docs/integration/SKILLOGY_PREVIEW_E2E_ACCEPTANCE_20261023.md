# Skillogy protected Preview acceptance audit — 2026-10-23

## Scope and conclusion

This audit uses the Integration tree at `59b1e01b0ba5fc0a35284e0352582ccf883a866b` (merged recommendation fix, PR #29). It did not deploy, change Preview settings, use Neon, call paid AI, or modify Production. **The Integration release is not yet ready for Production consideration:** the current protected Preview and Neon journey could not be authenticated and independently observed.

The intended journey is: browser Individual intake → same-origin Frontend `/api/v1/*` proxy → protected Backend → Preview profile store → response validation → recommendations and learning views. Browser access was unavailable in this audit: local browser use was disabled in Work settings and the Mac was locked. The `vercel` CLI was unavailable; no authenticated Vercel or Neon connector was available. Source inspection and local SQLite tests are identified separately below.

## Deployment identity and the two observed URLs

| Check | Status | Evidence |
| --- | --- | --- |
| Integration commit | PASS | Local fetched `origin/integration/career-radar-dosm-pr15` HEAD is `59b1e01`; GitHub reports the PR #29 head cross-stack `integrated` check completed successfully. |
| Previously failing Frontend `https://syncera-frontend-bhnj557w4-frank219wan.vercel.app` | BLOCKED | One anonymous `HEAD /api/v1/health` returned Vercel HTTP 302 to SSO on 2026-10-23. This verifies a protection gate, not application health or the deployment SHA. |
| Previously working Frontend `https://syncera-frontend-ffsiglu8u-frank219wan.vercel.app` | BLOCKED | One anonymous `HEAD /api/v1/health` returned HTTP 404 with `x-vercel-error: DEPLOYMENT_NOT_FOUND` on 2026-10-23. The previously observed Career Matches, Business Analyst 43.02, Data Analyst 31.62, and snapshot `snap_my_20261021_01` are user-reported historical observations, not repeatable evidence from this audit. Its exact commit is unverified. |
| Frontend deployment for merged commit | BLOCKED | Public GitHub commit status for `59b1e01` says `Vercel – syncera-frontend: success` and links to a Vercel deployment record, but public status does not identify either alias. Vercel deployment API returned HTTP 403 without login; GitHub Deployments listed no records. Build success does not prove runtime success. |
| Backend Preview version and Frontend origin binding | BLOCKED | No authenticated deployment metadata or effective `BACKEND_PREVIEW_ORIGIN` was accessible. A previously recorded Backend alias, `syncera-backend-git-integration-postgres-pre-a79754-frank219wan.vercel.app`, returned an anonymous Vercel SSO HTTP 302, but it has not been established as the current Frontend upstream. |

The **known local contract defect** before PR #29 was `recommendations[*].skill_gaps[*].current_level`: FastAPI's `response_model_exclude_none=True` omits an unknown level, while the old Frontend validator rejected omission. The deterministic full-response regression failed before the fix and passes after it. This explains the prior error **if** `bhnj557w4` carried the old validator. Since both deployment SHAs and the successful URL's current deployment are unavailable, their differing behavior cannot be attributed conclusively to a specific release or Backend version. The merged source accepts only omitted, `null`, or valid integer levels while retaining strict profile, snapshot, rank, score, and provenance checks.

## Individual journey matrix

Statuses in the **Preview** column refer only to this audit's real Vercel/Neon environment. Local evidence is explicitly separate.
No live application failure was reproduced in this audit; `BLOCKED` is not a pass and should not be converted to `FAIL` without a response from an authenticated deployment.

| Step | Preview | Local evidence and limit |
| --- | --- | --- |
| Individual entry, intake, fictional sample | BLOCKED | Routes and sample controls exist; browser presentation was unavailable. |
| Manual normalization | BLOCKED | Local deterministic API: HTTP 200 and profile returned. |
| Synthetic PDF/DOCX upload | BLOCKED | Local proxy → Backend tests generated fictional files and passed for both formats. Preview upload feature flag and timeout remain unverified. |
| Five psychology scenarios, skipped answers, Other text, consent | BLOCKED | Local cross-stack test persisted all five answer slots, null skips, Other text, and consent through confirmation and readback. |
| Confirmation and profile revision | BLOCKED | Local readback preserved profile ID; edit raised revision by one; stale requests returned HTTP 409. |
| Moderate and Fast recommendations, scenario switch | BLOCKED | Both Backend responses passed the actual strict Frontend validator locally. Browser switching and Preview versions were not observed. |
| Role details, ranking, score breakdown, snapshot and provenance | BLOCKED | Local test checked matching profile/snapshot through the validator, ranked response, role details, evidence IDs, and source endpoints. It used `synthetic_demo` data and deterministic scoring. |
| Unknown skill level / skill gaps | BLOCKED | Local Backend omitted at least one `current_level`; current Frontend validator accepted omission and mapped it to `null`. |
| Skill Mind Map | BLOCKED | Local confirmed profile received a nonempty skill-map response for an actual recommended gap; UI was not observed. |
| Learning Roadmap generation | BLOCKED | Local confirmed profile received a nonempty roadmap; UI was not observed. |
| Roadmap adoption | DEMO-ONLY | `api.adopt()` only changes browser state. No server persistence contract is wired. |
| Bamboo growth and task completion | DEMO-ONLY | In Demo Mode, task completion changes local state and has unit tests. In real mode `api.task()` raises `SERVICE_UNAVAILABLE`, and the Backend progress route is an intentional HTTP 503 stub. |

The local cross-stack test also changed psychology answers and consent, then confirmed that recommendation role IDs and scores were unchanged. This is local evidence that psychology answers do not arbitrarily affect deterministic matching. It is not proof of the running Preview's adapter or scoring configuration.

## Preview Neon persistence

**BLOCKED. No Preview Neon data was read or written.** The real protected API and Preview database were not authenticated in this session. The local cross-stack tests used a dedicated temporary SQLite file and cannot establish Neon persistence or Preview database isolation. Backend source requires `PROFILE_STORE=postgres` on Vercel Preview, a PostgreSQL `DATABASE_URL`, and TLS; these are fail-closed configuration checks, not evidence of the effective deployed settings.

The requested independent GET readback is also a separate access gate: Backend registers `GET /api/v1/profiles/{profile_id}` on Vercel only when `ENABLE_PROFILE_READBACK=1`, and the Frontend proxy deliberately does not whitelist this path. The route has no per-profile ownership check, so enabling it is an access-control decision, not a routine test toggle. With authenticated project access, first verify it is already enabled and that deployment protection limits readers appropriately; otherwise mark the readback step blocked and use an approved, narrowly scoped inspection method. Do not change the flag merely to pass acceptance.

Pending live checks with a new fictional profile: normalize or upload → confirm and record ID/revision privately → independently authenticated Backend GET → edit and confirm → fresh request/session GET with incremented revision → stale revision HTTP 409 → verify answer/consent changes and clearing on the same ID. Check the database project's Preview branch identity without displaying connection strings or profile contents. Do not delete existing records.

## Organization workflows

| Workflow | Status | Evidence and limit |
| --- | --- | --- |
| B1 team, departments and employee records | DEMO-ONLY | `Organization.tsx` edits app state persisted in browser `localStorage`; sample `Canopy Works · Demo` is synthetic. No live organization repository is connected. |
| B1 dashboard, heatmap, mobility, training suggestions | DEMO-ONLY | Views derive from local organization records. The B1 analyze path saves a local planning version and explicitly says no AI analysis was generated. Training growth has local unit coverage. Browser rendering was not observed. |
| B2 bundled student dataset and profiles | DEMO-ONLY | `tvetSample` is bundled fictional data; `Organization.tsx` loads and edits it in browser state. |
| B2 trends, gaps, cohort, institution insights | DEMO-ONLY / BLOCKED | Source contains these routes and local calculations, but `api.organization()` raises `SERVICE_UNAVAILABLE` in real API mode. Thus the normal Analyze action cannot complete on a real-mode Frontend Preview. No Preview browser workflow was run. Do not present its outputs as verified Backend or AI results. |

## Security and provenance

| Check | Status | Evidence and limit |
| --- | --- | --- |
| Anonymous Frontend access | PASS for the older `bhnj557w4` alias only | Anonymous health request redirected to Vercel SSO. The unavailable `ffsiglu8u` alias cannot be assessed. |
| Backend protection | PASS for the previously recorded Backend alias only | Anonymous health request redirected to Vercel SSO. Current upstream alias unverified. |
| Same-origin browser API | PASS in source / BLOCKED live | `src/services/api.ts` uses relative `/api/v1`; `vercel.json` rewrites to `api/proxy.ts`. Actual browser Network requests were unavailable. |
| Proxy containment | PASS in local tests / BLOCKED live | Source restricts paths, methods, query parameters, body sizes, and response sizes; bypass credential stays server side; Preview-only gate and rate backstop are present. WAF and Frontend Authentication effective settings were not inspected. |
| Frontend bundle secrets | PASS for local build / BLOCKED live | The local real-mode `dist/assets/*.js` scan found no `BACKEND_PROTECTION_BYPASS_SECRET`, bypass header, `DATABASE_URL`, or TokenHub key name. The deployed bundle and API responses were not inspected. |
| Paid AI disabled | PASS in this audit / BLOCKED live | Local server explicitly ran the deterministic adapter with live career analysis disabled. Source defaults the paid career analyzer off unless `ENABLE_LIVE_CAREER_RECOMMENDATION=1`; effective Preview env was not readable. |
| DOSM market flags | PASS in source / BLOCKED live | Frontend DOSM mode requires an explicit flag; Backend market radar is separately gated. Effective Preview flags were not readable. Synthetic role signals must not be labelled verified DOSM job demand. |
| Automatic Git deployments | PASS in source | Both Frontend and Backend `vercel.json` have `git.deploymentEnabled=false`; no deployment was triggered by this audit. |

## Automated evidence and gaps

- Local `corepack pnpm test`: **64 passed**. The worktree reused an existing `node_modules` whose lockfile matched byte-for-byte; pnpm warned about the local virtual-store setting. No registry install was required.
- Local `VITE_API_MODE=real corepack pnpm run build`: **passed** (TypeScript and Vite).
- Local Backend `pytest tests -q`: **123 passed, 2 skipped** (six deprecation warnings).
- Local `tests/cross-stack.test.ts` against loopback Backend using a deterministic adapter and temporary SQLite: **2 passed**. It covered health, normalize, confirm, trends, Moderate/Fast, strict recommendation validation, roles/evidence, skill map, roadmap, fictional PDF/DOCX upload through the proxy, psychology edits/clearing, revision conflict, and score stability.
- Public GitHub check for PR #29 head `e77bd53`: `integrated` **success**. The merged Integration commit itself showed only a successful Vercel Preview Comments check when queried; this is not a live E2E pass.
- CI does not verify protected Vercel Authentication, deployed Frontend/Backend SHA pairing, effective Preview environment scope, Neon branch identity and persistence, a fresh browser session, real-mode B1/B2 behavior, WAF enforcement, paid AI flags, or a deployed bundle secret scan.

No new regression code was needed for this audit: the current cross-stack test already exercises the former recommendation defect and psychology/CAS behavior. No validation was weakened.

## Bugs and release blockers

| Priority | Finding | Minimal next step |
| --- | --- | --- |
| P0 | No authenticated real Frontend → Backend → Neon acceptance evidence; `ffsiglu8u` now returns `DEPLOYMENT_NOT_FOUND`. | With existing authorized Vercel access, identify a current protected Frontend alias and its exact commit, then execute the fictional Individual flow and independent persistence checks. |
| P1 | The two historical Preview behaviors cannot be tied to commits or effective Backend origin. | Inspect Vercel deployment metadata for both aliases and effective Preview environment *names/scope*; compare Frontend commit to `59b1e01` and Backend contract version without printing values. |
| P1 | B2 Analyze in real API mode calls an intentionally unconnected organization endpoint and returns 503. | Label the Preview B2 experience as demo-only or provide a separate local Demo Mode for a demonstration; treat live organization analysis as future scoped work. |
| P1 | Profile GET readback lacks per-profile ownership checks when enabled. | Do not broaden `ENABLE_PROFILE_READBACK`; use an approved protected inspection path for Neon acceptance and design ownership controls before any general exposure. |
| P2 | Roadmap adoption and Bamboo progress are browser-only or unconnected in real mode. | Keep the UI labelling explicit; test local behavior separately from durable API progress. |

## Safe authenticated acceptance sequence

1. In the Vercel project, identify both Frontend deployment aliases and commit SHAs. Record whether `ffsiglu8u` was removed or the URL was mistyped. Verify the Frontend build uses `59b1e01` or a later compatible commit; do not assume the latest deployment is working.
2. Confirm Frontend Preview Authentication and Backend Preview Authentication remain enabled. Verify the Frontend's Preview-scoped `VITE_API_MODE`, `BACKEND_PREVIEW_ORIGIN`, and server-only `BACKEND_PROTECTION_BYPASS_SECRET` are present and correctly scoped by name, without revealing values. Check the actual Backend deployment SHA and its Preview-only Postgres/TLS configuration.
3. Use an authenticated Vercel session (`vercel curl` if available) to check the exact protected Frontend `/api/v1/health`; observe same-origin browser Network on the same deployment. Confirm the Backend origin from deployment settings, not from an old alias. Keep WAF and protection on.
4. Use only fictional profile/CV data. Run the Individual path above, record response status, request ID, profile ID and revision privately, and independently verify Preview persistence. Inspect response metadata and provenance without storing full personal payloads.
5. Verify B1 and B2 in a browser and label local-only paths as demo. Check that real-mode B2's service-unavailable message is clear. Do not activate paid MiniMax or unapproved DOSM flags as part of acceptance.

No branch was merged and no deployment was triggered during this audit.
