# Backend + AI/Technical Phase 4 integration report

Date: 2026-10-21 MYT. Status: **IMPLEMENTED and TESTED; source/resource approval PENDING; remote deployment BLOCKED**. The tests and security review in this report were completed before GitHub delivery. No merge, PR #1 retargeting, Replit deployment, or candidate-data activation was performed.

## Git and integration scope

- Repository: `Frank219wan/SyncEra`. Local branch: `feature/backend-ai-integration`, based on the fetched `origin/feature/backend-integration` at `024b4d6` (`ci: add automated backend tests`). The Tech branch was initially reviewed at `d253b98`; a fresh fetch during delivery found its merge of Backend CI and new correction at `1e69050`. The request-level field fix, regression test and `TECHNICAL_REVIEW.md` were incorporated without overwriting local provenance changes. `origin/main` was at `34beee2` when audited.
- The Tech delivery was applied locally for review before the integration commit. Its initial 20-file diff adds `backend/futureproof_ai/`, `backend/tech_delivery/`, `backend/tests/test_futureproof_ai_delivery.py`, `backend/docs/tech/` and PRD v1.5, and updates Backend/root handoff documents. The latest Tech correction added one review file and a request-level field propagation fix. Backend's pre-existing `.github/workflows/backend-ci.yml` and all frontend source files were retained. No same-name code conflict occurred.
- Phase 4 changes refine the import boundary and provenance metadata, add two focused precheck tests, extend CI to PRs targeting `feature/backend-integration`, add an isolated loopback HTTP test harness and evidence, and update README/handoff. The frozen `contracts/FutureProof_AI_OpenAPI_v1_0.yaml` and public request/response schemas were not changed.
- GitHub delivery target: a separate **draft Tech Integration PR with base `feature/backend-integration` and head `feature/backend-ai-integration`**. Keep Backend PR #1 based on `main` unchanged. This is a stacked PR depending on PR #1; after PR #1 merges, inspect the actual commit history before changing the integration PR base and rerun CI. Neither PR is auto-merged.

## Actual callable modules and HTTP connection

| Capability | Implementation and status |
|---|---|
| Adapter factory | `futureproof_ai.futureproof_adapter.create_adapter()` returns `FutureProofAdapter`; `AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter` was loaded through `app.ai_adapter.load_ai_adapter()` in a real Uvicorn process. **IMPLEMENTED, TESTED**. |
| Extraction | `FutureProofAdapter.extract_profile(text, questionnaire)` calls `futureproof_ai.extraction.extract_profile`. PDF/DOCX text is passed through the existing upload → normalize → SQLite unconfirmed profile path. Inferred skill levels remain null until confirmation. **IMPLEMENTED, TESTED**. |
| Scoring | `FutureProofAdapter.score_roles(profile, trend_package, scenario)` calls the delivered `futureproof_ai.scoring.score_roles`. The existing Backend `/recommendations` route builds the package and validates role IDs, evidence IDs and weighted arithmetic; no duplicate matching engine was added. **IMPLEMENTED, TESTED**. |
| Request field override | A valid request-level `preferred_field_id` reaches the adapter via a temporary Profile copy; the confirmed SQLite Profile is unchanged. **IMPLEMENTED, TESTED**. |
| Trend helper | `futureproof_ai.trends.retrieve_trends(profile_or_cohort, snapshot_id, top_k=20, *, market_repository=...)` is callable and filters a repository snapshot. The HTTP route currently uses `app.services.trend_package()` instead of this helper. **IMPLEMENTED, TESTED as a helper; not separately wired into the route**. |
| Algorithm type | Deterministic catalogue extraction and weighted rule-based matching. **No LLM, vector search, live market fetch, training, or model inference**. |

`adapter.is_mock=False` means the configured algorithm computes from inputs. It does not certify the input or output as a fully real product result. All accepted CVs/profiles are declared synthetic, so normalize/upload responses are `synthetic_demo / meta.is_mock=true`. The isolated candidate market is `mixed_demo / meta.is_mock=true` in trend and evidence responses. Recommendations and resource-bearing plans remain `mixed_demo / meta.is_mock=true`. A genuinely reviewer-approved market snapshot may later label its *trend/evidence* responses `public_open / is_mock=false`; the synthetic profile and static role catalogue still make personalized recommendations mixed.

## Candidate market snapshot audit

The package `tech_delivery/snapshot_dosm_mycol_my_2026q2_v1.json` has canonical ID `snap_my_dosm_mycol_2026q2_v1`, region `MY`, observation window 2026-04-01 through 2026-06-30, collection timestamp 2026-10-21T03:20:00Z and method `fp-trend-dosm-mycol-v0.1.0`. The two evidence IDs, `role_data_analyst` and `skill_sql` map to the Backend catalogue. It contains one role signal and one skill signal; it does **not** cover the wider Malaysian labour market or historical movement.

- DOSM evidence: the [official Q2 2026 Job Market Insights PDF](https://www.dosm.gov.my/uploads/release-content/file_20260818075305.pdf) shows Business Data Analyst (MASCO 2524-16) at 3,053 Q2 online job offerings and the displayed STEM Technician row at 6,565. The candidate's `46.50 = round(100 × 3053 / 6565, 2)` is a within-table normalization, **not market share**. `valid_postings=3053`; `delta_percent=null`.
- TalentCorp evidence: the [MyCOL publication page](https://www.talentcorp.com.my/mycol/) links the candidate [2024/2025 report](https://www.talentcorp.com.my/images/uploads/publication/204/MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf). A [related official 2024/2025 report PDF](https://www.talentcorp.com.my/images/uploads/publication/204/MYMAHIR-MALAYSIA-CRITICAL-OCCUPATIONS-LIST-2024-2025-1762766315.pdf) describes Data Professionals (MASCO 2524) and the broader data/analytics/database skill family. The exact candidate PDF was too large for the web inspection tool to open, so its text and edition still need Team Lead inspection. Mapping that broad family to `skill_sql` and the taxonomy score `70` are **human heuristics**, not observed SQL prevalence or growth; `mention_rate` and `change_pp` are null. The evidence date field currently uses the 2026-10-21 collection date rather than a confirmed publication date and must be reviewed.
- Moderate multiplier 1.00 and Fast multiplier 1.05 are explicit assumptions. The role outlook is 46.50 versus 48.83; observed counts, windows and evidence IDs do not change. The package states single-quarter coverage and methodological uncertainty.
- The package and manifests pass schema, HTTPS, date, ID, cross-reference and score-bound validation **only when explicitly allowed as an isolated technical precheck**. The normal CLI and `load_dir()` now reject `reviewed_by=technical-precheck-...`; the precheck is never accepted as a reviewer-owned manifest by default. No candidate file was written to `backend/data/approved/`, and `ACTIVE_SNAPSHOT_ID` was not configured for normal startup. **Structural validation TESTED; formal source and method approval PENDING**.

## Microsoft Learn candidate resource

`tech_delivery/resources_python_p1.json` maps `resource_mslearn_python_fundamentals_p1` to canonical `skill_python`, English (`en`), MYR 0, 3.2 estimated hours. The [Microsoft Learn path](https://learn.microsoft.com/en-us/training/paths/get-started-with-python-fundamentals/) currently displays **Get Started with Python Programming: Part 1 - Fundamentals**, four modules and 3 hr 12 min; the candidate title was corrected to match this source. The isolated `ResourceRepository` selected it for a Python skill gap and it appeared in Skill Map and Roadmap HTTP responses. There is no course-completion proof. The `verified_at` field is a technical source-check timestamp, **not Team Lead approval**. The normal importer rejects the supplied resource precheck manifest; a verified badge in the final demo requires a new reviewer-owned resource approval. **Candidate mount TESTED; final verification PENDING**.

## Real loopback HTTP A flow

Run from `backend/`: `.venv/bin/python scripts/generate_phase4_http_evidence.py`. It starts `scripts.phase4_test_server:app` on `127.0.0.1` with `PHASE4_TEST_ONLY=1`, the configured Tech adapter, temporary SQLite and explicit in-memory precheck repositories. The server refuses normal import. Full synthetic request/response records are in [phase4_http_evidence.json](phase4_http/phase4_http_evidence.json); machine-readable checks are in [summary.json](phase4_http/summary.json). PDF and DOCX bytes were generated in memory and not saved.

| Check | Actual result |
|---|---|
| `/api/v1/health`, `/docs`, `/openapi.json` | HTTP 200 each; 16 `/api/v1` paths. |
| Synthetic PDF and DOCX multipart upload | HTTP 200 each; distinct parsed skill sets; inferred levels null; unconfirmed revision 1. |
| Recommendation before confirmation | HTTP 422 `PROFILE_NOT_CONFIRMED`. |
| User confirmation and stale retry | HTTP 200, revision 2; stale revision retry HTTP 409. |
| Candidate role/skill trend reads | HTTP 200, `mixed_demo / is_mock=true`; observed role postings 3,053 and score 46.50 unchanged before/after both scenarios. |
| Moderate / Fast recommendations | HTTP 200 / 200; scenario outlook 46.50 / 48.83; recomputed match scores 54.08 / 54.54. Each score equals the 45/20/20/15 weighted breakdown within 0.01. |
| Evidence and skill gaps | Both cited Evidence IDs resolved over HTTP and stayed `mixed_demo / is_mock=true`; `skill_python` was a gap. |
| Python Skill Map and Roadmap | HTTP 200 / 200; both used the candidate Microsoft Learn resource ID, URL, language, cost and duration. |
| P1 progress, organization analysis and trend refresh | HTTP 503 each; not implemented. |

These are **technical tests with candidate sources**, not a production or judge-facing trusted-data demonstration.

## Regression, CI and contract comparison

- Python 3.12 environment: `pip check` reported no broken requirements. Full `python -m pytest tests -q`: **38 passed, 0 failed, 0 skipped**, with six dependency deprecation warnings. This includes the original 31 Backend tests, five Tech delivery tests and two new precheck/provenance tests. PDF/DOCX upload, confirmation, import validation, score integrity and OpenAPI tests remain active. The live HTTP evidence generator also completed all assertions.
- `.github/workflows/backend-ci.yml` remains present and runs `python -m pytest tests -q`, import and OpenAPI route checks. Its PR trigger now includes `feature/backend-integration` as a base, and it separately verifies that `AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter` loads. **Local CI-equivalent steps TESTED; GitHub-hosted run pending push/PR**.
- API Contract v1.0 defines 15 method/path pairs. Runtime OpenAPI has those same 15 plus the additive `POST /api/v1/profiles/upload`, for 16 total. The runtime OpenAPI equals the previously exported `docs/integration/openapi.json` exactly; no existing public request/response schema was changed. P1 progress, organization analysis and trend refresh still return HTTP 503.
- `git diff --check` passed. The 29 addable changed/new files were scanned for `.env`, SQLite databases, PDF/DOCX CVs, keys/tokens, private-key blocks, logs and binary files: **no findings**. Python caches generated by tests are covered by `.gitignore`; no frontend source file was modified.

## PRD v1.5 review and frontend handoff

PRD v1.5's revision note records the deterministic baseline and disabled P1 scope, but several target-state passages still describe current MVP delivery as LLM extraction/recommendation, hybrid/vector RAG, Bamboo progress, three operational A/B1/B2 pipelines, verified learning resources and a deployed Replit demo. The actual Backend has deterministic A-flow scoring, local snapshot retrieval, a candidate course, 13 usable routes and three P1 routes returning 503. B1/B2 are not implemented as Backend flows. The PRD's FR-16 says 15 endpoints while the additive upload makes 16. Its Section 10.3 lists route/locale/idempotency/staleness metadata beyond API Contract v1.0 and current OpenAPI. Its bubble-area target expects observed demand sizing, while the Backend intentionally uses equal area without comparable verified volume. These are **product decisions / scope gaps**, not grounds to silently expand the frozen API.

Frontend can begin **synthetic integration testing** against this local branch after it is published: set the API origin/CORS, use `POST /profiles/upload` or `/profiles/normalize`, show unconfirmed skills and nullable levels, send `profile_revision` on confirm, then request Moderate/Fast recommendations with `snapshot_id`. Display `meta.data_label`, `meta.is_mock`, observation window, Evidence links, assumptions and uncertainty separately. Do not show a verified course badge for the technical precheck. The existing frontend `VITE_API_MODE=real` is still an adapter skeleton, not a completed page-by-page API binding; its B1/B2 and Bamboo screens remain local demo behavior. The Tech candidate covers only one MY role signal and one skill signal.

## Deployment blockers and Team Lead decisions

1. **APPROVAL PENDING:** independently inspect the exact DOSM and TalentCorp originals, Q2 numbers, MASCO mapping, SQL taxonomy score/method, source date, coverage, rights and uncertainty; accept or revise the candidate. Create new reviewer-owned source manifests with exact URLs and a real review timestamp.
2. **APPROVAL PENDING:** inspect the Microsoft Learn title, URL, availability, cost, language, 3.2-hour estimate and Python mapping; create a new reviewer-owned resource manifest. The technical precheck is not a verified-course badge.
3. **APPROVAL PENDING:** decide whether the additive upload route and PRD v1.5 target wording should be formally reconciled with API Contract v1.0, and which unmet LLM, Bamboo, B1/B2, RAG, metadata and frontend requirements are in scope for the judging demo.
4. **BLOCKED pending approvals and integration:** import only the genuinely approved manifests, explicitly select a reviewed active snapshot, complete frontend real-mode binding, and run deployment smoke tests. Replit has not been remotely deployed or verified; local SQLite persistence, CORS and runtime configuration must be checked there. Do not use a real person's CV in the demonstration.

## Reviewable local file list

The 29 changed or new files relative to `origin/feature/backend-integration` are:

- CI and root product handoff: `.github/workflows/backend-ci.yml`, `README.md`, `docs/product/FutureProof_AI_PRD_v1_5_Fused_EN_ZH.md`.
- Existing Backend configuration, service and docs: `backend/.env.example`, `backend/AI_BACKEND_HANDOFF.md`, `backend/README.md`, `backend/REAL_DATA_INTEGRATION_REPORT.md`, `backend/app/approved_data.py`, `backend/app/main.py`, `backend/tests/test_api.py`.
- Tech algorithm: `backend/futureproof_ai/__init__.py`, `backend/futureproof_ai/extraction.py`, `backend/futureproof_ai/futureproof_adapter.py`, `backend/futureproof_ai/scoring.py`, `backend/futureproof_ai/trends.py`.
- Candidate source/resource bundle: `backend/tech_delivery/INTEGRATION.md`, `backend/tech_delivery/SOURCE_METHOD.md`, `backend/tech_delivery/TECHNICAL_REVIEW.md`, `backend/tech_delivery/source_approvals_TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION.json`, `backend/tech_delivery/snapshot_dosm_mycol_my_2026q2_v1.json`, `backend/tech_delivery/resource_approvals_TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION.json`, `backend/tech_delivery/resources_python_p1.json`.
- Integration tests and evidence: `backend/tests/test_futureproof_ai_delivery.py`, `backend/scripts/phase4_test_server.py`, `backend/scripts/generate_phase4_http_evidence.py`, `backend/docs/tech/FutureProof_AI_Tech_Delivery_Report_v0_1_0.md`, `backend/docs/integration/BACKEND_AI_INTEGRATION_REPORT.md`, `backend/docs/integration/phase4_http/phase4_http_evidence.json`, `backend/docs/integration/phase4_http/summary.json`.
