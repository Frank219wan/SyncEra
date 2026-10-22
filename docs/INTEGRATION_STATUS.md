# Full-stack integration status

Date: 2026-10-22  
Upstream `origin/main`: `4542c18` (PRs #1–#9 merged)  
Latest unsubmitted team branch integrated locally: `feat/frontend-ui-v1.2` at `a8d1093`  
Integration branch: `codex/latest-team-integration`

## Repository merge review

- Fetched all available `origin/*` branches. The only new feature diff based directly on current main was `feat/frontend-ui-v1.2`; its landing visuals, font dependency, canvas component, and silhouette asset are included here.
- The existing `origin/fix/backend-ai-stabilization` branch is based on an older pre-MiniMax backend. Its same-origin serving and trusted reason/uncertainty/tie-order checks are already in current main. Its eligible-role omission guard was missing, so that narrow validation and regression coverage were ported without merging the stale branch.
- Older backend, frontend logic, contract, and deep-link branches are represented by merged PR content and were not replayed over current main.

## Current connected product behavior

- Individual real-mode flow uses the shared FastAPI `/api/v1` contract for profile normalization/confirmation, trends/radar, recommendations, role/task detail, evidence, skill maps, and roadmaps.
- Local VS Code tasks run `futureproof_ai.futureproof_adapter`: deterministic profile extraction and `tech-v1` role scoring. No paid provider call is made by the default run configuration.
- Current main also contains an **optional Tencent TokenHub MiniMax-M3 profile extraction adapter**. It is activated only when the backend is configured with `AI_ADAPTER_MODULE=futureproof_ai.tencent_tokenhub_adapter` and a server-side `TENCENT_TOKENHUB_API_KEY`. It calls the LLM for non-empty text declared synthetic. Form-only profile normalization stays local. Role scoring, score arithmetic, explanations, evidence checks, skill maps, and roadmaps remain deterministic. Metadata remains `synthetic_demo` / `is_mock=true`; this is not authorization for real CV or personal data.
- The frontend is not wired to the backend file upload endpoint. PDF/DOCX upload remains a backend-only synthetic-input path.
- Organization analysis, progress sync, and admin trend refresh routes return 503. HR/TVET local UI workflows do not imply server persistence.
- Candidate market data and learning resources remain pending human approval; synthetic fixtures are the normal data source. No authentication, tenant isolation, real-data privacy/retention lifecycle, or production deployment is verified.

## Testing

Follow [the Individual-first test plan](TEST_PLAN_INDIVIDUAL_FIRST.md) in sequence. Its automated suite checks each service boundary; browser steps cover the real-mode Individual path, while explicitly noting local-only progress and unavailable P1 endpoints.

Latest local verification on `codex/latest-team-integration`:

- Frontend unit/contract suite: **29 passed**.
- Backend pytest suite: **75 passed**, 6 dependency deprecation warnings.
- TypeScript and production build in real API mode: passed.
- Live API vertical slice through profile normalization, confirmation, trends, recommendations, evidence, skill map, and roadmap: passed against FastAPI.
- Frontend contract flow through Vite proxy `5174 → 8001`: passed.
- Built single-process app on `8765`: landing page, Individual deep route, silhouette asset, and health endpoint returned 200; unknown API route returned the expected structured 404; live Individual API slice passed.
- Browser route review: landing, onboarding, radar (synthetic role/skill data), and unconfirmed-profile recommendation gate rendered. The onboarding form itself was not submitted interactively; use the ordered manual steps in the test plan for profile entry and confirmation.

The TokenHub adapter tests use an offline mock transport. No provider key was configured and no paid LLM call was made. This run does not verify public deployment, approved market data, HR/TVET server functions, or server-side learning progress.

## VS Code run configuration

Open this repository folder and run **Terminal → Run Task → Start FutureProof full stack (dev)**. The Vite frontend is at `http://127.0.0.1:5174`; FastAPI is at `http://127.0.0.1:8001` and health is `/api/v1/health`. The one-process local preview task serves the built frontend and API at `http://127.0.0.1:8765`.
