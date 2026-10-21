# Phase 2 real-data integration report

Date: 2026-10-21 MYT. Initial Phase 2 result: **integration plumbing implemented; real-data integration was blocked on external deliverables**.

## Tech v0.1.0 follow-up

The later `feature/tech-integration` delivery adds `futureproof_ai/`, a DOSM/TalentCorp candidate Snapshot, one verified Microsoft Learn resource, method/integration notes and Tech integration tests. The complete backend suite now passes **37 tests**. The Individual frontend real-mode contract is connected and covered by a live normalize-to-roadmap CI test. The candidate data is still not active governance-approved data: files named `TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION` must be replaced by Team Lead reviewer-owned manifests before import/activation. The remaining P0 blockers are human source/resource approval, approved-data import and live Replit verification. The sections below preserve the Backend Phase 2 audit state before the Tech handoff.

## Audit result

The existing backend uses one FastAPI app, strict Pydantic request/response models, SQLite profile storage with revision-aware confirmation, synthetic catalogue/snapshots, a demo extraction adapter, deterministic demo recommendation scoring, and 15 registered routes. The earlier 10 tests were rerun and passed before Phase 2 changes. There was no runnable AI teammate module, public/open market dataset, reviewer-approved evidence, or vetted learning-resource catalogue in the workspace. The directory is not a Git repository, so no branch/status or commit exists. The root `.replit` already starts Uvicorn from `backend/` on `0.0.0.0` and `${PORT:-8000}`.

## Implemented in Phase 2

- Added `MarketRepository` with explicit synthetic and reviewed-public provenance. The importer validates evidence IDs, exact approved HTTPS source URLs, dates, region, window, catalogue mappings, signal-to-evidence references, duplicate IDs, observed-metric shape, score bounds, scenario assumptions and safe IDs. It preserves old snapshots and requires `ACTIVE_SNAPSHOT_ID` for activation.
- Added `ResourceRepository` with exact URL approval matching, skill mapping, verification timestamps, language/currency/budget selection and no URL invention.
- Added a local JSON import CLI. The three P1 routes remain disabled; none can upload or activate data publicly.
- Routed bubbles, trends, evidence lookup, role details and recommendations through the selected snapshot repository. Scenario changes alter only the projected component. The server still builds the normalized trend package; the frontend cannot supply one.
- Added configurable Python AI adapter loading with a clear startup error if a configured module is missing or malformed. The unconfigured default remains a labelled rule-only demo. No actual AI teammate module was connected.
- Added integration tests using **test-only** simulated review manifests and URLs. No test URL is stored in production runtime data or represented as real market evidence.

## Endpoint status now

| Endpoint | Status | Current production data behavior |
|---|---|---|
| `GET /health` | REAL | Process health. |
| `GET /explore/bubbles` | MOCK | Synthetic by default; reviewed-public snapshot path is ready. |
| `GET /trends/roles` | MOCK | Synthetic by default; approved import changes provenance. |
| `GET /trends/skills` | MOCK | Synthetic by default; approved import changes provenance. |
| `GET /roles/{role_id}` | MOCK | Static synthetic role catalogue; can cite imported snapshot evidence. |
| `GET /roles/{role_id}/tasks` | MOCK | Task impact remains synthetic. |
| `GET /evidence/{evidence_id}` | MOCK | Synthetic default; imported approved evidence is served as public. |
| `POST /profiles/normalize` | PARTIAL | Rule-only fallback; configurable real adapter is ready. |
| `POST /profiles/confirm` | REAL | Validated SQLite confirmation and revision. |
| `POST /recommendations` | PARTIAL | Server snapshot input, validated scores/IDs/evidence; rule-only fallback until AI module. |
| `POST /learning/skill-map` | PARTIAL | Synthetic nodes; approved links attach only when imported. |
| `POST /learning/roadmap` | PARTIAL | Feasibility logic; approved links attach only when imported. |
| `POST /progress/skills` | BLOCKED | P1 disabled, HTTP 503. |
| `POST /organizations/{mode}/analyze` | BLOCKED | P1 disabled, HTTP 503. |
| `POST /admin/trends/refresh` | BLOCKED | P1 disabled, HTTP 503. |

## Tests and deployment

Command: `cd backend && .venv/bin/python -m pytest tests -q`. Result: **27 passed, 0 failed, 0 skipped, 1 Starlette/AnyIO dependency deprecation warning** in 0.46 s. Tests cover original OpenAPI P0 shapes, reviewed import path, invalid/missing evidence, catalogue integrity, source approval, resource allowlist, score arithmetic, snapshot conflict, scenario isolation, changed market input, missing AI module and configured test-module execution. There is no real AI module integration test because the module has not been supplied.

The backend remains locally runnable with `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`. Replit dependency installation and startup command are configured. `FRONTEND_ORIGINS`, `DATABASE_PATH`, `APPROVED_DATA_DIR`, `ACTIVE_SNAPSHOT_ID` and `AI_ADAPTER_MODULE` are documented in `.env.example`. SQLite persists on local disk; Replit ephemeral storage may lose profiles at restart. The updated Uvicorn app returned HTTP 200 locally for `/api/v1/health` and `/docs`; the process was then stopped. No remote Replit URL or live health check exists, and no remote deployment was made.

## Blockers and owners

1. **AI/Technical:** deliver at least one genuine dated public/open MY market package with source URLs, signal methods and uncertainty, plus evidence review inputs. The backend cannot infer or invent these.
2. **AI/Technical + Team Lead/Integration:** manually verify source content/rights and sign the exact URL approval manifest; choose an active snapshot only after review.
3. **AI/Technical:** deliver runnable extraction and deterministic matching module conforming to `AI_BACKEND_HANDOFF.md`. A test-only adapter proves loading works, but no real module was available.
4. **AI/Technical + Team Lead/Integration:** deliver and approve at least one real learning resource for a demonstrated skill gap.
5. **Backend:** connect and test real teammate output when delivered; strengthen domain-calculation verification and task/skill-map integration against actual inputs.
6. **UI/Frontend:** display provenance flags, source dates, confirmation revision, uncertainty and missing-resource warnings; keep all AI calls behind `/api/v1`.
7. **Team Lead/Integration:** perform Replit import, CORS setup and live end-to-end verification. No deployment was authorized or claimed.

**Acceptance:** API integration capability is ready and locally tested. A genuinely evidence-grounded judge-facing recommendation flow remains **BLOCKED** until real reviewed market input, real AI functions, approved resources and a live deployment are delivered.
