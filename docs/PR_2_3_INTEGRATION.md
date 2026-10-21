# PR #2 / PR #3 integration verification

Date: 2026-10-22

The integration preserves the current frontend-contract branch (including PR #5),
the Tech branch's review fixes, and the Backend fixes already merged into `main`.
PR #3 continues to target `feature/tech-integration`; PR #2 continues to target
`main`. Neither PR base was changed.

## Conflict resolutions

- Keep the latest frontend onboarding, radar, profile editing, HR intake, and
  learning-history screens.
- Preserve Tech's API-derived learning hours, roadmap feasibility/capacity and
  resource verification dates. Real skill maps do not fall back to demo courses.
- Keep Backend's independent `demo-v1` / `tech-v1` scoring validation, upload body
  guard, mandatory revision for repeated confirmation, and atomic SQLite CAS.
- Declare the deterministic adapter's `tech-v1` scoring policy. Verify narrative,
  uncertainty, and tie ordering without importing the adapter's implementation
  into the Backend validator.
- Keep synthetic/rule-based extraction labelled `is_mock=true`, even when a
  configured adapter claims otherwise. No LLM inference is claimed.
- Keep both current SPA static serving and the Tech `STATIC_DIR` configuration.
  Unknown API and missing asset paths remain 404; deep frontend routes work.
- Preserve both CI workflows; run the full-stack workflow for the Tech base too,
  select pnpm from `packageManager`, and exercise the configured Tech adapter.

## Local verification

The isolated merge worktree was tested with Python 3.13, pnpm 11.25.0 and the
locked frontend dependencies. GitHub CI retains its Python 3.12 check.

| Check | Result |
| --- | --- |
| Backend pytest | 62 passed; one existing Starlette/AnyIO deprecation warning |
| pip check | No broken requirements |
| Frontend tests | 28 passed |
| TypeScript and real-mode production build | Passed |
| Live normalize → confirm → recommendations → skill map → roadmap | Passed |
| Live frontend contract → trends → recommendations → role → evidence | Passed |
| `/api/v1/health` | 200, status `ok` |
| `/openapi.json` | 200; all 16 API paths registered |
| `/individual/recommendations` refresh | 200, built frontend returned |

The HTTP tests used synthetic profiles, local SQLite and
`AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter` on loopback.
No candidate Snapshot/resource approval manifests were activated.

The unfinished Vercel/PostgreSQL changes remain uncommitted in the separate
`feature/vercel-fullstack-preview` worktree. This PR integration does not deploy
to Vercel or establish PostgreSQL persistence.
