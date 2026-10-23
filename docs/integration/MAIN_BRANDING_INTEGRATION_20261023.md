# Main branding integration into Career Radar

Base: `integration/career-radar-dosm-pr15` at `42f12a0`. Source: `main` at `b722f86`. This branch merges the histories without changing either source branch. No Vercel deployment or database operation was run.

## Resolution by file

| File | Resolution |
| --- | --- |
| `public/images/skillogy-logo-transparent.png` | Added the transparent Skillogy mark from `main`. |
| `src/components.tsx` | Added the accessible day/night toggle and transparent sidebar logo; retained the Integration navigation and route context. |
| `src/main.tsx` | Imported `theme.css` after existing styles; retained all Individual, HR/L&D, TVET, Radar and API routes. |
| `src/pages/About.tsx` | Used the transparent logo; retained existing About content. |
| `src/pages/Landing.tsx` | Added the theme toggle beside motion and language controls; retained the landing links and animations. |
| `src/store.tsx` | Resolved the sole textual conflict by combining `main`'s separately persisted theme with Integration's `persistAppState`, `STORAGE_KEY`, and `startNewProfile` reset. Theme changes do not overwrite the individual profile. |
| `src/theme.css` | Added the readable day/night palette, including Individual and Organization surfaces. |

The merge does not modify either `vercel.json`; both still contain `git.deploymentEnabled=false`. The Frontend API proxy, Backend PostgreSQL/Neon integration, Revision CAS, Psychology Assessment, career journeys, HR/L&D, TVET, and DOSM Radar remain in the Integration tree. The merge does not enable paid AI or DOSM market flags.

## Draft PR #28 follow-up

- `src/theme.css` now gives the optional Psychology Assessment distinct dark-mode normal, hover, selected, and focused option states. Question text, A–E letters, native radio controls, and the consent checkbox use readable foregrounds and visible focus styling. The existing `src/styles.css` rule still sets the compact 54px minimum height and mobile spacing.
- `.github/workflows/cross-stack-ci.yml` now runs on pull requests targeting `integration/career-radar-dosm-pr15` as well as the existing `main` and `feature/tech-integration` targets. The workflow still runs frontend tests/build and Backend pytest; no Vercel configuration changed.
- CSS color-pair contrast calculations range from 6.10:1 to 13.06:1 for the checked dark states, and the light option text is 7.67:1. The theme state reads and writes the `skillogy-theme` local-storage key. Browser-level desktop/mobile visual and reload checks remain open because local browser control is disabled in Work settings.

## Local verification

- After the Draft PR #28 follow-up, `CI=true corepack pnpm test`: 64 passed.
- After the Draft PR #28 follow-up, `CI=true corepack pnpm run build`: TypeScript and Vite build passed.
- After the Draft PR #28 follow-up, Backend Python 3.12 `python -m pytest tests -q`: 123 passed, 2 skipped.
- JSON parse and configuration comparison: both Vercel files remained byte-for-byte unchanged by the merge.
- Local Demo browser smoke: landing, dark-mode toggle, and Individual home rendered; theme toggle remained selected across navigation. Full merged browser journey and real Preview were not verified.

## Open Draft PR recommendations (no PR closed)

- **#26:** Obsolete for the current Integration base. It changes a nullable Psychology radio type cast to `NonNullable`; Integration already uses equivalent `Exclude<PsychologyChoice,null>` and builds successfully. Its older branch would also lose later localization and assessment changes if merged wholesale.
- **#21:** Still needs separate review. Its older Preview integration overlaps the current branch, but `src/marketSnapshot.ts`, `src/services/api-base.ts`, and related single-analysis changes remain distinct. Compare contracts and safety gates before deciding whether to port any part; do not merge the branch wholesale.
- **#20:** Mostly overlapped by current Individual Psychology, MASCO/DOSM and Neon code. Review its remaining provenance/schema differences before considering closure.
- **#13:** Older PostgreSQL Preview baseline overlaps current Integration. Keep until the protected Preview contract and persistence acceptance are confirmed against the consolidated branch; then consider closure.
- **#12 and #11:** Earlier Preview persistence/deployment attempts, apparently superseded by #13 and current Integration. Review any unique migration or infrastructure detail before closing.

## Manual protected Preview release checklist

1. Review and merge this Draft PR into `integration/career-radar-dosm-pr15` only after approval. Confirm `git.deploymentEnabled=false` in both project-root config files. Keep `main` untouched.
2. In Vercel, confirm `syncera-frontend` Root Directory is repository root and `syncera-backend` Root Directory is `backend`. Confirm both Preview deployments have Vercel Authentication enabled and no public bypass exception. Confirm Frontend `/api/v1/*` WAF rate limits.
3. Confirm the existing protected Backend Preview is healthy, contract-compatible with the merged commit, and connected only to the isolated Preview Neon database with TLS. Do not migrate or edit records merely for this branding release. If its contract is older, schedule a separately reviewed Backend Preview deployment first.
4. In the Frontend project's **Preview** environment, confirm `VITE_API_MODE=real`, `BACKEND_PREVIEW_ORIGIN`, and server-side `BACKEND_PROTECTION_BYPASS_SECRET`. The origin must be the approved Backend Preview alias. The secret must never have a `VITE_` prefix. Keep `VITE_DOSM_MARKET_RADAR_ENABLED=false` unless its source has been approved. Keep paid AI gates disabled.
5. After steps 1–4, a human may manually create a **Preview** deployment from the exact Integration commit in Vercel. Do not select Production or `--prod`. Automatic Git deployments remain disabled.
6. Before entering test data, confirm anonymous requests to Frontend `/` and `/api/v1/health`, and Backend `/api/v1/health`, are challenged. Stop if any protected route responds anonymously. Then authenticate to Frontend and verify same-origin `/api/v1/health` HTTP 200 without CORS preflight redirects.
7. With fictional data only, verify CV upload or manual intake → all five Psychology answers and consent → Normalize → Confirm → PostgreSQL readback → Moderate/Fast recommendations → skill gaps → mind map → roadmap. Verify stale revisions return 409 and psychology answers do not change deterministic match scores.
8. Check browser Network/build assets and Function logs for secret leakage; inspect Frontend WAF hits, Backend logs, Preview Neon isolation, and any failed requests before calling the Preview accepted.

Production readiness remains blocked on a reviewed Preview deployment and real end-to-end security/data verification. Local tests alone cannot establish Vercel Authentication, WAF, Backend alias routing, Neon behavior, or paid-AI gating in the deployed environment.
