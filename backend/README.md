# FutureProof AI backend MVP

Python 3.10+ / FastAPI backend. The default run remains an explicitly labelled **synthetic demo**. Tech v0.1.0 adds a deterministic adapter, a real-source candidate market package and a Microsoft Learn course candidate. The provided technical-precheck manifests are rejected by the normal import path; Team Lead reviewer-owned approvals are required before activation. Do not submit real CVs, student records or employee records.

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

`POST /api/v1/profiles/upload` accepts `multipart/form-data`: `file` (PDF or DOCX), `synthetic_input=true`, `study_constraints` (a required JSON string matching `StudyConstraints`), and optional `preferred_field_id`. The default **file** limit is 10 MiB; `MAX_CV_UPLOAD_BYTES` may lower it. An ASGI guard limits the **whole multipart request** to the configured file limit plus 256 KiB before Starlette parses it. It rejects an excessive `Content-Length` immediately with 413 `CV_REQUEST_TOO_LARGE`, rejects malformed length with 400 `BAD_REQUEST`, and counts actual request chunks even with no or false length. The existing endpoint file limit returns 413 `CV_TOO_LARGE`. PDF page count, extracted text, and DOCX archive size/part count are bounded. Scanned PDFs need a text-based replacement; OCR is not implemented. The endpoint does not persist the original file or parsed text, but multipart handling may use a temporary spool file within the request bound. The response uses the same `NormalizeData` schema as `/profiles/normalize`, with an unconfirmed profile. Confirm it using `/profiles/confirm` before requesting recommendations. With `AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter`, the delivered deterministic extractor and scorer run; neither uses an LLM. Synthetic intake responses remain `synthetic_demo / is_mock=true` even though the configured adapter object has `is_mock=False`. Public deployment also needs infrastructure request, rate and concurrency limits plus a hard parser time limit; the current parser time checks are cooperative.

**Demo use only:** upload fictional synthetic CVs. `synthetic_input=true` is a declaration, not proof that the file contains no personal information. This service has no user authentication, isolation, deletion workflow, or retention policy for real CV data; do not use it for real personal records. The added upload contract is pending team review.

## Test

```bash
cd backend
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests -q
```

For current pre-merge fix results, see [PR1_PR4_PREMERGE_FIX_REPORT.md](docs/integration/PR1_PR4_PREMERGE_FIX_REPORT.md). If the sandbox reports `PermissionError: EEXIST ... mkdir .../T/pytest-of-unknown`, re-run with a fresh basetemp: `.venv/bin/python -m pytest tests -q --basetemp="$(mktemp -d)/fp_pytest"` — this is an environment artifact, not a test failure.

Tests cover all 16 route registrations, the synthetic vertical slice, actual PDF/DOCX multipart upload, original OpenAPI P0 response schemas, reviewed local import validation, source/resource approvals, snapshot/score consistency and AI adapter failure/loading. They make no paid model calls. Test-only URLs and approvals remain in temporary test storage; they are not production data.

## Data and AI integration

- `app/catalogue.py`: canonical synthetic role/skill fixture IDs. These IDs must be coordinated with AI/Technical and Team Lead before public snapshot import.
- `app/approved_data.py`: validated repositories for synthetic and reviewer-approved public snapshots and approved learning resources. Public data requires original HTTPS URLs, dated evidence and a separate exact-match approval manifest. The supplied technical-precheck identities are rejected by the normal importer/loader. This validates structure and provenance records; human review must verify source content.
- `app/import_data.py`: local import command. It is not an HTTP endpoint. See [AI_BACKEND_HANDOFF.md](AI_BACKEND_HANDOFF.md) for input schemas and commands.
- `app/ai_adapter.py`: configurable extraction/scoring boundary. A configured missing module fails startup; unconfigured mode uses an explicitly mock rule-only fallback.
- `app/services.py` and `app/scoring_validation.py`: server-built trend input and independent, versioned `demo-v1`/`tech-v1` score, complete gap and evidence validation. Review status and time feasibility remain visible.
- `app/storage.py`: SQLite profile confirmation with conditional revision update. The first confirmation may omit `profile_revision`; every later edit requires it. Missing or stale revisions return HTTP 409. Unconfirmed profiles cannot be recommended. See [contract addendum](contracts/PROFILE_CONFIRM_AND_SCORING_ADDENDUM.md).
- `futureproof_ai/`: deterministic `extract_profile`, `retrieve_trends`, `score_roles` and the Backend-loadable adapter factory.
- `tech_delivery/`: DOSM/TalentCorp candidate Snapshot, Microsoft Learn resource, source/method notes and clearly labelled technical-precheck manifests pending Team Lead approval.

Bubble areas remain equal when no comparable verified posting volume exists. The synthetic snapshot reports no observed job counts or growth percentages. Moderate/Fast changes scenario projections, not observed source metrics. A formally reviewed imported source can be `public_open`; the current candidate IDs cannot be promoted in place and remain `mixed_demo / is_mock=true` only in isolated technical tests. Its SQL coverage is unknown (`null`). Recommendations mixing synthetic user input and real-source candidates remain `mixed_demo / is_mock=true`. Resources without a matching reviewer-owned approval cannot appear in normal map or roadmap output. Reviewer text alone is not identity proof; Team Lead must control new release IDs, manifests, approved files and deployment configuration.

For an isolated, synthetic live HTTP test of the candidate snapshot and resource, run `.venv/bin/python scripts/generate_phase4_http_evidence.py` from `backend/`. It starts a loopback Uvicorn server, uses temporary SQLite and in-memory precheck repositories, and writes request/response evidence to `docs/integration/phase4_http/`. It never imports the precheck manifests into `data/approved`. See [Phase 4 integration report](docs/integration/BACKEND_AI_INTEGRATION_REPORT.md).

P1 progress, organization and refresh routes are registered but disabled with HTTP 503. No browser-accessible route can activate a snapshot.

## Replit

The SyncEra root `.replit` installs dependencies and runs Uvicorn from `backend/` on `0.0.0.0` and `${PORT:-8000}`. This backend was integrated on `feature/backend-integration` after the branch was updated to the latest frontend-bearing `main`. The existing frontend files and its root `.gitignore` were preserved. See [docs/integration/GITHUB_SYNC_INTEGRATION.md](docs/integration/GITHUB_SYNC_INTEGRATION.md) for the checkout and review status. No Replit deployment was performed. If the team later imports the repository as a Replit project, set `FRONTEND_ORIGINS`, add reviewed data files if approved, then verify `/api/v1/health` and `/docs` on the assigned URL. SQLite on ephemeral Replit storage is suitable only for a demo unless a persistent volume is configured.
