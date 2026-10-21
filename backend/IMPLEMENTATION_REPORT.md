# FutureProof AI backend implementation report

Updated 2026-10-21 (MYT), Phase 2. This report supersedes the earlier synthetic-only Phase 1 status. The workspace is not a Git repository, so no branch/status or commit exists. No remote deployment was made.

## Source audit

The workspace has `PRD.docx` (PRD v1.3), `AI_API_CONTRACT.md` (API Contract v1.0), `FutureProof_AI_OpenAPI_v1_0.yaml`, `Role.pdf` (four-role plan), `A-B1-B2算法模型流程(1).md` and `Domain 1/Domain 1.pdf`. These are shorter/different filenames than several names in the original task. Conceptual flow ZIPs contain documents/images, not executable AI callbacks. No real market dataset, reviewed evidence URLs, vetted resource catalogue or runnable AI teammate module was found. The current public-facing default remains a labelled synthetic demo.

The PRD/delivery plan mention bamboo in the Oct 22 MVP, while the later API contract classifies `/progress/skills` as P1. The backend follows the API contract and leaves P1 disabled.

## A. Endpoint completion

| Method | Path | Status | Implementation |
|---|---|---|---|
| GET | `/api/v1/health` | REAL | Process health and API version. |
| GET | `/api/v1/explore/bubbles` | MOCK | Synthetic default; validated public snapshot can be selected locally. |
| GET | `/api/v1/trends/roles` | MOCK | Synthetic default; public import path tested. |
| GET | `/api/v1/trends/skills` | MOCK | Synthetic default; public import path tested. |
| GET | `/api/v1/roles/{role_id}` | MOCK | Synthetic catalogue; reviewed snapshot evidence can be attached. |
| GET | `/api/v1/roles/{role_id}/tasks` | MOCK | Synthetic task impacts remain. |
| GET | `/api/v1/evidence/{evidence_id}` | MOCK | Synthetic default; reviewed public evidence can be served with public label. |
| POST | `/api/v1/profiles/normalize` | PARTIAL | Rule-only default; Python AI adapter loading ready. |
| POST | `/api/v1/profiles/confirm` | REAL | Validates catalogue IDs, persists confirmation/revision in SQLite. |
| POST | `/api/v1/recommendations` | PARTIAL | Confirmed profile + server-built snapshot package, adapter invocation, score/ID/evidence validation; fallback remains mock. |
| POST | `/api/v1/learning/skill-map` | PARTIAL | One-skill synthetic nodes; only reviewed resource links can attach. |
| POST | `/api/v1/learning/roadmap` | PARTIAL | Capacity/feasibility and budget/language filters; learning-hour estimates remain partly heuristic. |
| POST | `/api/v1/progress/skills` | BLOCKED | P1 registered, HTTP 503. |
| POST | `/api/v1/organizations/{mode}/analyze` | BLOCKED | P1 registered, HTTP 503. |
| POST | `/api/v1/admin/trends/refresh` | BLOCKED | P1 registered, disabled HTTP 503. |

## B. Files added or modified

Phase 2 additions: `app/approved_data.py` (reviewed snapshot/resource repositories and import validation), `app/import_data.py` (local import CLI), `tests/test_approved_data.py` (integrity, provenance, adapter and resource regression tests), `AI_BACKEND_HANDOFF.md` (teammate interface), `REAL_DATA_INTEGRATION_REPORT.md` (Phase 2 evidence and blockers).

Phase 2 modifications: `app/ai_adapter.py` (configured module loader and explicit fallback), `app/services.py` (snapshot-specific evidence, scenario/score validation and approved resources), `app/main.py` (repository injection, provenance meta and approved-data serving), `.env.example` (integration settings), `README.md` (run/import/deployment instructions), `IMPLEMENTATION_REPORT.md` (this updated report).

Existing `app/models.py`, `app/catalogue.py`, `app/storage.py`, `tests/test_api.py`, requirements, pytest configuration and both `.replit` files remain in use; they were not replaced for Phase 2. Generated `.venv`, cache and empty local SQLite files are not source deliverables.

## C. AI integration

No real AI function was supplied or executed. The default `DemoAdapter.extract_profile` and `demo_recommendations` are mock. A configured module must export `create_adapter()` with `extract_profile` and `score_roles`, and explicitly report `is_mock`. Missing or malformed configured modules fail startup; there is no silent live claim. A test-only module proved the dynamic loader invokes its extraction method, but it is **not** a real AI teammate integration test.

Expected schemas and remaining functions are documented in `AI_BACKEND_HANDOFF.md`. Backend validates approved role/gap/evidence IDs, 0–100 component bounds and weighted score arithmetic. Inputs are a confirmed `Profile` and server-built `TrendPackage` pinned to one snapshot. Moderate/Fast affects scenario projection only; observed role/skill metrics remain unchanged. The current role catalogue and fallback descriptions are synthetic, so recommendations retain `is_mock=true` even if a reviewed market snapshot is imported.

## D. Test results

Command: `cd backend && .venv/bin/python -m pytest tests -q`. Result: **27 passed, 0 failed, 0 skipped, 1 Starlette/AnyIO deprecation warning** in 0.46 s on Python 3.12. Original OpenAPI P0 response shapes, all 15 route registrations, full synthetic flow, reviewed import simulation, evidence/reference rejection, score arithmetic, scenario isolation, resource allowlist, missing AI module and test-module execution are covered. Test URLs/approvals are isolated and labelled test-only. No paid model calls. A real AI integration test remains blocked by the missing module.

## E. Deployment

Local: `cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`. Health: `/api/v1/health`; Swagger: `/docs`. Root `.replit` installs dependencies and runs on Replit's `PORT`. Configure `FRONTEND_ORIGINS`, `DATABASE_PATH`, `APPROVED_DATA_DIR`, `ACTIVE_SNAPSHOT_ID` and `AI_ADAPTER_MODULE` as appropriate. SQLite profiles require persistent storage to survive an ephemeral Replit restart. The updated Uvicorn app was started on local loopback `127.0.0.1:8766`; `/api/v1/health` and `/docs` both returned HTTP 200, then the process was stopped. No Replit URL or remote live-health verification exists; no remote deployment was authorized or attempted.

## F. Remaining blockers, prioritized

1. **AI/Technical:** supply one real dated MY public/open snapshot with original source URLs, normalized scores, provenance and uncertainty. Backend import capability exists; no real source has been approved/imported.
2. **AI/Technical + Team Lead/Integration:** review original source content, methodology and rights, then provide the exact-match approval manifest and activate the reviewed snapshot.
3. **AI/Technical:** deliver runnable extraction and deterministic matching functions with a reproducible sample. No actual module exists in this workspace.
4. **AI/Technical + Team Lead/Integration:** provide and approve at least one original course/resource link for a demonstrated gap.
5. **Backend:** connect and test the delivered AI module and source package; validate domain-specific scoring and task/skill-map outputs when supplied.
6. **UI/Frontend:** show source dates, `is_mock`, uncertainty, profile confirmation/revision and missing-resource or feasibility warnings.
7. **Team Lead/Integration:** deploy on Replit and verify live `/health`, `/docs` and full UI flow; remote deployment is outside this local result.

## G. Acceptance

The backend has a locally working, schema-valid synthetic P0 vertical slice and now has a tested reviewed-data/AI import boundary. A genuinely evidence-grounded judge-facing P0 flow is **BLOCKED** by missing real reviewed market evidence, real AI functions, vetted learning links and remote deployment. P1 remains disabled.
