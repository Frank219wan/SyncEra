# FutureProof AI backend MVP

Python 3.10+ / FastAPI backend. The default run remains an explicitly labelled **synthetic demo**. Tech v0.1.0 adds a deterministic adapter, a real-source candidate market package and a verified course candidate; none becomes active public data until Team Lead replaces the technical-precheck manifests with reviewer-owned approvals. Do not submit real CVs, student records or employee records.

## Run locally

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Health: `http://localhost:8000/api/v1/health` · Swagger: `http://localhost:8000/docs` · API prefix: `/api/v1`.

`FRONTEND_ORIGINS` is a comma-separated origin list (default `http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173`). `DATABASE_PATH` selects the local SQLite profile store (default `backend/data/profiles.sqlite`). `APPROVED_DATA_DIR` holds reviewer-approved local JSON packages. `ACTIVE_SNAPSHOT_ID` opts into one loaded approved snapshot; unset uses synthetic demo. `AI_ADAPTER_MODULE` selects a Python module exposing `create_adapter()`; unset uses the mock adapter. See `.env.example`. No provider key is needed for the fixture adapter and no browser-visible secret is configured.

## Synthetic CV upload (proposed additive v1 extension)

`POST /api/v1/profiles/upload` accepts `multipart/form-data`: `file` (PDF or DOCX), `synthetic_input=true`, `study_constraints` (a required JSON string matching `StudyConstraints`), and optional `preferred_field_id`. The default file limit is 10 MiB; `MAX_CV_UPLOAD_BYTES` may lower it. PDF page count, extracted text, and DOCX archive size/part count are bounded. Scanned PDFs need a text-based replacement; OCR is not implemented. The endpoint does not persist the original file or parsed text, but FastAPI's multipart handling may use a temporary spool file during the request. The response uses the same `NormalizeData` schema as `/profiles/normalize`, with an unconfirmed profile. Confirm it using `/profiles/confirm` before requesting recommendations. The default extractor is a content-dependent, rule-only fallback (`meta.is_mock=true`); no real AI teammate module is connected.

**Demo use only:** upload fictional synthetic CVs. `synthetic_input=true` is a declaration, not proof that the file contains no personal information. This service has no user authentication, isolation, deletion workflow, or retention policy for real CV data; do not use it for real personal records. The added upload contract is pending team review.

## Test

```bash
cd backend
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests -q
```

Latest Backend + Tech result: **36 passed, 0 failed, 0 skipped** (including 5 Tech integration tests). If the sandbox reports `PermissionError: EEXIST ... mkdir .../T/pytest-of-unknown`, re-run with a fresh basetemp: `.venv/bin/python -m pytest tests -q --basetemp="$(mktemp -d)/fp_pytest"` — this is an environment artifact, not a test failure.

Tests cover all 16 route registrations, the synthetic vertical slice, actual PDF/DOCX multipart upload, original OpenAPI P0 response schemas, reviewed local import validation, source/resource approvals, snapshot/score consistency and AI adapter failure/loading. They make no paid model calls. Test-only URLs and approvals remain in temporary test storage; they are not production data.

## Data and AI integration

- `app/catalogue.py`: canonical synthetic role/skill fixture IDs. These IDs must be coordinated with AI/Technical and Team Lead before public snapshot import.
- `app/approved_data.py`: validated repositories for synthetic and reviewer-approved public snapshots and approved learning resources. Public data requires original HTTPS URLs, dated evidence and a separate exact-match approval manifest. This validates structure and provenance records; human review must verify source content.
- `app/import_data.py`: local import command. It is not an HTTP endpoint. See [AI_BACKEND_HANDOFF.md](AI_BACKEND_HANDOFF.md) for input schemas and commands.
- `app/ai_adapter.py`: configurable extraction/scoring boundary. A configured missing module fails startup; unconfigured mode uses an explicitly mock rule-only fallback.
- `app/services.py`: server-built trend input, catalogue and score validation, basic skill map and roadmap. Review status and time feasibility remain visible.
- `app/storage.py`: SQLite profile confirmation. Clients should send optional `profile_revision` to reject stale edits. Unconfirmed profiles cannot be recommended.
- `futureproof_ai/`: deterministic `extract_profile`, `retrieve_trends`, `score_roles` and the Backend-loadable adapter factory.
- `tech_delivery/`: DOSM/TalentCorp candidate Snapshot, Microsoft Learn resource, source/method notes and clearly labelled technical-precheck manifests pending Team Lead approval.

Bubble areas remain equal when no comparable verified posting volume exists. The synthetic snapshot reports no observed job counts or growth percentages. Moderate/Fast changes scenario projections, not observed source metrics. A real imported source can be `public_open`; recommendations mixing synthetic user input and real market data are `mixed_demo`, and remain `is_mock=true` while rule-only scoring is used. Resources without matching manual approval cannot appear in map or roadmap output.

P1 progress, organization and refresh routes are registered but disabled with HTTP 503. No browser-accessible route can activate a snapshot.

## Replit

The SyncEra root `.replit` installs dependencies and runs Uvicorn from `backend/` on `0.0.0.0` and `${PORT:-8000}`. This backend was integrated on `feature/backend-integration` after the branch was updated to the latest frontend-bearing `main`. The existing frontend files and its root `.gitignore` were preserved. See [docs/integration/GITHUB_SYNC_INTEGRATION.md](docs/integration/GITHUB_SYNC_INTEGRATION.md) for the checkout and review status. No Replit deployment was performed. If the team later imports the repository as a Replit project, set `FRONTEND_ORIGINS`, add reviewed data files if approved, then verify `/api/v1/health` and `/docs` on the assigned URL. SQLite on ephemeral Replit storage is suitable only for a demo unless a persistent volume is configured.
