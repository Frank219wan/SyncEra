# AI/Technical → Backend handoff

Status: **Tech v0.1.0 adapter integrated and locally tested; Team Lead source/resource approval and deployment integration remain pending**. The existing `/api/v1` contract remains unchanged. `futureproof_ai/` supplies the deterministic callable adapter, and `tech_delivery/` supplies a real-source candidate Snapshot plus course resource. Files named `TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION` are test inputs, not governance approval; the normal import command now rejects them. The browser cannot post a market package or approve links.

## Repository location and development commands

Working source: `backend/` in the team SyncEra repository. The local Phase 4 integration branch is `feature/backend-ai-integration`, based on `feature/backend-integration` plus the delivery from `feature/tech-integration`. Python 3.10+ is required; Python 3.12 was used for the latest Backend run. Install `requirements-dev.txt`, start `app.main:app`, and run the API/AI boundary tests with:

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
.venv/bin/python -m pytest tests -q
```

To run the delivered deterministic adapter in the normal synthetic mode, set `AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter` before Uvicorn. Leaving it unset uses the older `DemoAdapter`. No LLM provider is called in either mode. For the candidate data A flow, run `.venv/bin/python scripts/generate_phase4_http_evidence.py` on the local integration branch; its loopback test app explicitly loads prechecks into temporary repositories and saves HTTP evidence under `docs/integration/phase4_http/`.

The adapter entry point is `app/ai_adapter.py`; Pydantic inputs/outputs are in `app/models.py`; canonical `role_id` and `skill_id` values are in `app/catalogue.py`; approved snapshot/evidence/resource import checks are in `app/approved_data.py`. `futureproof_ai/` implements the callable Tech adapter, while `tests/test_futureproof_ai_delivery.py` verifies extraction, candidate imports, reproducible scoring and the A-flow resource handoff. Set `AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter` only after the intended data/provenance mode is understood.

The latest Tech branch correction passes a request-level `preferred_field_id` to scoring through an in-memory Profile copy. The confirmed Profile stored in SQLite is not changed. Its source/method review is `tech_delivery/TECHNICAL_REVIEW.md`; that technical review does not replace Team Lead approval.

`POST /api/v1/profiles/upload` is a proposed additive v1 contract extension. It parses PDF/DOCX bytes in `app/cv_upload.py`, passes the extracted text through the same `services.normalize()` and `extract_profile()` path as the existing text endpoint, and returns `Envelope[NormalizeData]`. Multipart fields are `file`, `synthetic_input=true`, `study_constraints` (JSON-encoded `StudyConstraints`), and optional `preferred_field_id`. Its profile is unconfirmed and must use `/profiles/confirm` before matching. The adapter receives extracted text, not the binary file. Current `DemoAdapter` is rule-only and content-dependent; no LLM is connected. Only fictional synthetic CVs are allowed for the demo. See `tests/test_cv_upload.py` for HTTP multipart and confirmation tests.

## 1. Deliver an importable Python adapter

Set `AI_ADAPTER_MODULE=your_package.futureproof_adapter`. That module must export `create_adapter()` and return an object with:

```python
is_mock: bool
extract_profile(text: str | None, questionnaire: dict | None) -> dict
score_roles(profile: app.models.Profile,
            trend_package: app.models.TrendPackage,
            scenario: str) -> list[dict]
```

The configured module is loaded on startup. A missing module, missing method, or missing `is_mock` flag stops startup with `AIAdapterConfigurationError`; it does not silently become a live result. With no module configured, the existing `DemoAdapter` remains the explicit rule-only fallback. A configured scorer must declare a supported `scoring_policy` (`tech-v1` for this delivery); an unknown policy's recommendation output is rejected with HTTP 502. The delivered adapter's `is_mock=False` describes its input-dependent computation, not approval of its inputs; the current recommendation route remains mock-labelled because the intake and catalogue are synthetic. The backend catches matching timeouts as HTTP 504 and malformed matching outputs as HTTP 502.

`extract_profile` returns `skills[]` entries using `ProfileSkill` (`skill_id`, nullable `level` 0–5, `source`, `confidence` 0–1), `interests[]`, `current_occupation`, `warnings[]`, and `unrecognized_skill_terms[]`. It does not invent proficiency. The backend stores the result as unconfirmed; the UI must confirm it before recommendations. Because every accepted intake is declared synthetic, HTTP normalization/upload metadata remains `synthetic_demo / is_mock=true` even when the algorithm object reports `adapter.is_mock=False`. The latter only means the deterministic computation is input-dependent.

`score_roles` receives **two validated inputs**: a confirmed profile and a server-built trend package. The trend package contains `snapshot_id`, `region`, `observation_window`, `role_signals[]`, `skill_signals[]`, `evidence[]`, `scenario_assumptions`, and `uncertainty`; each imported signal also carries its internal `score_basis`. Output must conform to `app.models.Recommendation` and the supplied OpenAPI `Recommendation` schema. The backend independently derives the complete gaps, levels, strengths, all four components, total, role and evidence IDs from trusted inputs under the declared `tech-v1` scoring policy; `DemoAdapter` uses compatible `demo-v1`. The weighted total is `0.45*skill_compatibility + 0.20*interests_preferences + 0.20*scenario_outlook + 0.15*transition_feasibility`, to rounding tolerance 0.01, but matching the total alone is insufficient. The score is a heuristic, not hiring probability. Moderate/Fast may change projected outlook; it must not change observed metrics. See [contract addendum](contracts/PROFILE_CONFIRM_AND_SCORING_ADDENDUM.md).

## Joint branch handoff for frontend and AI colleagues

After the integration branch is pushed, use `feature/backend-ai-integration` for the combined Backend and Tech code. From `backend/`, install `requirements-dev.txt`, then run `AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000`. The actual exported OpenAPI is `docs/integration/openapi.json`; the live endpoints are `/openapi.json` and `/docs`. The synthetic upload/confirm/recommend/skill-map/roadmap request and response sequence is saved in `docs/integration/phase4_http/phase4_http_evidence.json`.

For a normal local frontend test, leave `ACTIVE_SNAPSHOT_ID` unset; the default synthetic snapshot is `snap_my_20261021_01`. Obtain `profile_id` from the response to `/api/v1/profiles/upload` or `/api/v1/profiles/normalize`, display the unconfirmed profile, then send its `revision` as `profile_revision` to `/api/v1/profiles/confirm`. The first confirmation may omit it for compatibility; every subsequent change must include the latest revision or receives HTTP 409. Use that returned `profile_id` for `/api/v1/recommendations`, `/api/v1/learning/skill-map` and `/api/v1/learning/roadmap`. The IDs in recorded HTTP evidence are temporary examples, not reusable server records.

To reproduce the candidate-source A flow, run `.venv/bin/python scripts/generate_phase4_http_evidence.py` from `backend/`. Only that loopback test server explicitly loads `snap_my_dosm_mycol_2026q2_v1` and the Microsoft Learn resource from technical-precheck manifests. The normal import CLI rejects those manifests. No candidate source or course is Team Lead approved, and the final UI must not display a verified badge for it. Normal runtime still has synthetic role/task data and three P1 routes returning 503: progress/Bamboo, organization B1/B2 analysis, and trend refresh. Frontend `VITE_API_MODE=real` remains a partial adapter and needs live page-by-page integration.

The callable `futureproof_ai.retrieve_trends(profile_or_cohort, snapshot_id, top_k=20, *, market_repository=...)` loads a supplied repository snapshot, filters by preferred field and returns `TrendPackage`; the current HTTP recommendation route independently builds the same package via `app.services.trend_package`, so this helper is not called by that route. `analyze_tasks`, `build_skill_map`, `assemble_roadmap`, and `aggregate_cohort` are conceptual future AI interfaces and are **not connected**. The current Backend has its own deterministic skill-map and roadmap services.

## 2. Deliver a reviewed market snapshot JSON package

Use the existing IDs in `app/catalogue.py`, or coordinate a catalogue update with Team Lead and Backend before import. Required top-level keys:

| Key | Requirement |
|---|---|
| `snapshot_id`, `region` | Stable opaque ID, `MY` initially. |
| `window_start`, `window_end`, `collected_at` | ISO dates and timezone-aware collection timestamp; valid observation window. |
| `method_version`, `data_label` | Documented normalization method; `public_open` only after real review. |
| `evidence[]` | `Evidence` records with unique IDs, source title, original HTTPS URL, type, published/collected date, retrieval timestamp, `MY` region and limitations. |
| `role_signals[]`, `skill_signals[]` | Catalogue IDs; nullable 0–100 normalized score; `current_snapshot` or `insufficient_evidence`; nonempty evidence IDs; supported observed metrics; `score_basis` explaining calculation. |
| `scenario_assumptions` | Separate complete `moderate` and `fast` role multiplier maps (bounded 0.5–1.5); not observed statistics. |
| `assumption_basis`, `uncertainty` | Meaningful rationale and coverage/caveat text. |

Each evidence record requires a **separate reviewer-owned approval manifest** entry with exactly matching `evidence_id` and `source_url`, `reviewed_by`, and timezone-aware `reviewed_at` after retrieval. The backend validates structure, HTTPS/public host, timestamps, IDs, signal references, duplicate IDs, and current-snapshot-only labels. It rejects the known candidate IDs even if their reviewer strings are edited. This checks consistency; it cannot authenticate the reviewer or prove the page content or methodology is truthful. Team Lead must independently inspect the sources and authorize a new immutable package ID, with manifest creation and release controlled by protected repository and deployment permissions. No historical delta or “rising” label is accepted until comparable snapshots are implemented; candidate SQL coverage is unknown (`null`).

Import locally (no public HTTP write route):

```bash
cd backend
.venv/bin/python -m app.import_data snapshot \
  --package /path/to/reviewed_snapshot.json \
  --approvals /path/to/source_approvals.json \
  --output-dir ./data/approved
```

Then set `ACTIVE_SNAPSHOT_ID` to the **new** imported ID and restart. An unknown or precheck-only active ID fails normal startup. Old snapshots stay stored and addressable by explicit ID. `GET /trends/*` and `GET /evidence/*` show `public_open` only for imported packages; this label presumes the external reviewer-owned release process was followed. Recommendations combining a synthetic profile with imported market signals use `mixed_demo / is_mock=true`; the score is deterministic but the profile and role catalogue remain synthetic.

## 3. Deliver reviewed learning-resource JSON

Each entry is `{ "resource": Resource, "skill_ids": [catalogue_skill_id, ...] }`. `Resource` requires `resource_id`, course title, provider, original HTTPS URL, language, cost amount, currency, estimated hours, and timezone-aware `verified_at`. A separate approval manifest must contain exact `resource_id` and URL, `reviewed_by`, and `reviewed_at` after verification. Import with `python -m app.import_data resources --package ... --approvals ... --output-dir ./data/approved`. Only links matching this allowlist can appear in skill maps or roadmaps. The backend filters by selected skill, language, currency and remaining budget. Without eligible links, it omits the resource and keeps an explicit roadmap warning.

## 4. Integration acceptance from AI/Technical

- Supply a reproducible test module implementing the two connected functions and a schema-valid sample profile.
- Supply the reviewed snapshot package and approval manifest, with at least one role and one skill signal tied to actual dated source evidence.
- Demonstrate a changed reviewed signal changing a recommendation score while Moderate/Fast leaves observed metrics unchanged.
- Supply at least one reviewed resource for a demonstrated skill gap.
- Document source coverage, normalization, uncertainty, and scenario assumption basis. Team Lead must approve the public claims before `ACTIVE_SNAPSHOT_ID` points at the new package.
