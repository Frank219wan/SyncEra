# FutureProof AI backend MVP

Python 3.10+ / FastAPI backend. The default run is an explicitly labelled **synthetic demo**. No verified market snapshot, teammate AI module or approved course catalogue was present when this report was written. Do not submit real CVs, student records or employee records.

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

`POST /api/v1/profiles/upload` accepts `multipart/form-data`: `file` (PDF or DOCX), `synthetic_input=true`, `study_constraints` (a required JSON string matching `StudyConstraints`), and optional `preferred_field_id`. The default **file** limit is 10 MiB; `MAX_CV_UPLOAD_BYTES` may lower it. An ASGI receive guard limits the **entire multipart request** to the configured file limit plus 256 KiB of form/header overhead, checking declared `Content-Length` before multipart parsing and counting actual streamed bytes when length is absent or false. Exceeding that total returns 413 `CV_REQUEST_TOO_LARGE`; malformed length returns 400 `BAD_REQUEST`. The existing endpoint file limit still returns 413 `CV_TOO_LARGE`. PDF page count, extracted text, and DOCX archive size/part count are bounded. Scanned PDFs need a text-based replacement; OCR is not implemented. The endpoint does not persist the original file or parsed text, but multipart handling may use a bounded temporary spool file during the request. The response uses the same `NormalizeData` schema as `/profiles/normalize`, with an unconfirmed profile. Confirm it using `/profiles/confirm` before requesting recommendations. The default extractor is a content-dependent, rule-only fallback (`meta.is_mock=true`); no real AI teammate module is connected. A public deployment also needs infrastructure request/concurrency limits and a hard parser time limit; the parser's current time checks are cooperative.

**Demo use only:** upload fictional synthetic CVs. `synthetic_input=true` is a declaration, not proof that the file contains no personal information. This service has no user authentication, isolation, deletion workflow, or retention policy for real CV data; do not use it for real personal records. The added upload contract is pending team review.

## Test

```bash
cd backend
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests -q
```

Latest local result: **31 passed, 0 failed, 0 skipped** (27 pre-existing + 4 CV upload tests). If the sandbox reports `PermissionError: EEXIST ... mkdir .../T/pytest-of-unknown`, re-run with a fresh basetemp: `.venv/bin/python -m pytest tests -q --basetemp="$(mktemp -d)/fp_pytest"` — this is an environment artifact, not a test failure.

Tests cover all 16 route registrations, the synthetic vertical slice, actual PDF/DOCX multipart upload, original OpenAPI P0 response schemas, reviewed local import validation, source/resource approvals, snapshot/score consistency and AI adapter failure/loading. They make no paid model calls. Test-only URLs and approvals remain in temporary test storage; they are not production data.

## Data and AI integration

- `app/catalogue.py`: canonical synthetic role/skill fixture IDs. These IDs must be coordinated with AI/Technical and Team Lead before public snapshot import.
- `app/approved_data.py`: validated repositories for synthetic and reviewer-approved public snapshots and approved learning resources. Public data requires original HTTPS URLs, dated evidence and a separate exact-match approval manifest. This validates structure and provenance records; human review must verify source content.
- `app/import_data.py`: local import command. It is not an HTTP endpoint. See [AI_BACKEND_HANDOFF.md](AI_BACKEND_HANDOFF.md) for input schemas and commands.
- `app/ai_adapter.py`: configurable extraction/scoring boundary. A configured missing module fails startup; unconfigured mode uses an explicitly mock rule-only fallback.
- `app/services.py` and `app/scoring_validation.py`: server-built trend input and independent, versioned `demo-v1`/`tech-v1` score, gap and evidence validation. Review status and time feasibility remain visible.
- `app/storage.py`: SQLite profile confirmation. The first confirmation may omit `profile_revision` for Contract v1.0 compatibility. Every later update to a confirmed profile must include the current revision; missing revision returns 409 `PROFILE_REVISION_REQUIRED`, stale revision returns 409 `SNAPSHOT_CONFLICT`. Unconfirmed profiles cannot be recommended. See [confirm/scoring addendum](contracts/PROFILE_CONFIRM_AND_SCORING_ADDENDUM.md).

Bubble areas remain equal when no comparable verified posting volume exists. The synthetic snapshot reports no observed job counts or growth percentages. Moderate/Fast changes scenario projections, not observed source metrics. A real imported source can be `public_open`; recommendations mixing synthetic user input and real market data are `mixed_demo`, and remain `is_mock=true` while rule-only scoring is used. Resources without matching manual approval cannot appear in map or roadmap output.

P1 progress, organization and refresh routes are registered but disabled with HTTP 503. No browser-accessible route can activate a snapshot.

## Replit

The SyncEra root `.replit` installs dependencies and runs Uvicorn from `backend/` on `0.0.0.0` and `${PORT:-8000}`. This backend was integrated on `feature/backend-integration` after the branch was updated to the latest frontend-bearing `main`. The existing frontend files and its root `.gitignore` were preserved. See [docs/integration/GITHUB_SYNC_INTEGRATION.md](docs/integration/GITHUB_SYNC_INTEGRATION.md) for the checkout and review status. No Replit deployment was performed. If the team later imports the repository as a Replit project, set `FRONTEND_ORIGINS`, add reviewed data files if approved, then verify `/api/v1/health` and `/docs` on the assigned URL. SQLite on ephemeral Replit storage is suitable only for a demo unless a persistent volume is configured.
