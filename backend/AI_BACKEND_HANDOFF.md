# AI/Technical → Backend handoff

Status: **Tech v0.1.0 candidate delivered; Team Lead source/resource approval and deployment integration remain pending**. The existing `/api/v1` contract remains unchanged. `futureproof_ai/` now supplies the deterministic callable adapter, and `tech_delivery/` supplies a real-source candidate Snapshot plus course resource. Files named `TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION` are test inputs, not governance approval. The Backend accepts only canonical IDs and reviewer-approved local imports; the browser cannot post a market package or approve links.

## Repository location and development commands

Working source: `backend/` in the team SyncEra repository. Backend Phase 2 is based on `feature/backend-integration`; Tech v0.1.0 is delivered on `feature/tech-integration`. Python 3.10+ is required; Python 3.12 was used for the latest Backend run. Install `requirements-dev.txt`, start `app.main:app`, and run the API/AI boundary tests with:

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
.venv/bin/python -m pytest tests -q
```

The adapter entry point is `app/ai_adapter.py`; Pydantic inputs/outputs are in `app/models.py`; canonical `role_id` and `skill_id` values are in `app/catalogue.py`; approved snapshot/evidence/resource import checks are in `app/approved_data.py`. `futureproof_ai/` implements the callable Tech adapter, while `tests/test_futureproof_ai_delivery.py` verifies extraction, candidate imports, reproducible scoring and the A-flow resource handoff. Set `AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter` only after the intended data/provenance mode is understood.

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

The configured module is loaded on startup. A missing module, missing method, or missing `is_mock` flag stops startup with `AIAdapterConfigurationError`; it does not silently become a live result. With no module configured, the existing `DemoAdapter` remains the explicit rule-only fallback. `is_mock=False` will require real functions, approved inputs and a reviewed canonical role/skill catalogue; the current recommendation route remains mock-labelled because its catalogue and fallback explanations are synthetic. The backend catches matching timeouts as HTTP 504 and malformed matching outputs as HTTP 502.

`extract_profile` must return `skills[]` entries using `ProfileSkill` (`skill_id`, nullable `level` 0–5, `source`, `confidence` 0–1), `interests[]`, `current_occupation`, `warnings[]`, and `unrecognized_skill_terms[]`. It must not invent proficiency. The backend stores the result as unconfirmed; the UI must confirm it before recommendations.

`score_roles` receives **two validated inputs**: a confirmed profile and a server-built trend package. The trend package contains `snapshot_id`, `region`, `observation_window`, `role_signals[]`, `skill_signals[]`, `evidence[]`, `scenario_assumptions`, and `uncertainty`; each imported signal also carries its internal `score_basis`. Output must conform to `app.models.Recommendation` and the supplied OpenAPI `Recommendation` schema. Each role, gap skill and evidence ID must exist in the approved catalogue/snapshot. `match_score` must equal `0.45*skill_compatibility + 0.20*interests_preferences + 0.20*scenario_outlook + 0.15*transition_feasibility`, to rounding tolerance 0.01. The score is a heuristic, not hiring probability. Moderate/Fast may change projected outlook; it must not change observed metrics. Use only the matching snapshot's evidence IDs.

The conceptual future interfaces are `retrieve_trends(profile_or_cohort, snapshot_id, top_k)`, `analyze_tasks(role_id, snapshot_id)`, `build_skill_map(role_id, skill_id, constraints, resource_catalogue)`, `assemble_roadmap(skill_maps, study_constraints)`, and `aggregate_cohort(mode, groups, trend_package)`. They are **not connected**. Do not report them as active until delivered and validated.

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

Each evidence record requires a **separate reviewer-owned approval manifest** entry with exactly matching `evidence_id` and `source_url`, `reviewed_by`, and timezone-aware `reviewed_at` after retrieval. The backend validates structure, HTTPS/public host, timestamps, IDs, signal references, duplicate IDs, and current-snapshot-only labels. This checks consistency; it cannot prove the page content or methodology is truthful. AI/Technical and Team Lead must manually review the original source and its permitted use before approval. No historical delta or “rising” label is accepted until comparable snapshots are implemented.

Import locally (no public HTTP write route):

```bash
cd backend
.venv/bin/python -m app.import_data snapshot \
  --package /path/to/reviewed_snapshot.json \
  --approvals /path/to/source_approvals.json \
  --output-dir ./data/approved
```

Then set `ACTIVE_SNAPSHOT_ID` to the imported ID and restart. An unknown or unapproved active ID fails startup. Old snapshots stay stored and addressable by explicit ID. `GET /trends/*` and `GET /evidence/*` show `public_open` only for imported reviewed data. Recommendations combining a synthetic profile with imported market signals use `mixed_demo`; rule-only matching keeps `is_mock=true`.

## 3. Deliver reviewed learning-resource JSON

Each entry is `{ "resource": Resource, "skill_ids": [catalogue_skill_id, ...] }`. `Resource` requires `resource_id`, course title, provider, original HTTPS URL, language, cost amount, currency, estimated hours, and timezone-aware `verified_at`. A separate approval manifest must contain exact `resource_id` and URL, `reviewed_by`, and `reviewed_at` after verification. Import with `python -m app.import_data resources --package ... --approvals ... --output-dir ./data/approved`. Only links matching this allowlist can appear in skill maps or roadmaps. The backend filters by selected skill, language, currency and remaining budget. Without eligible links, it omits the resource and keeps an explicit roadmap warning.

## 4. Integration acceptance from AI/Technical

- Supply a reproducible test module implementing the two connected functions and a schema-valid sample profile.
- Supply the reviewed snapshot package and approval manifest, with at least one role and one skill signal tied to actual dated source evidence.
- Demonstrate a changed reviewed signal changing a recommendation score while Moderate/Fast leaves observed metrics unchanged.
- Supply at least one reviewed resource for a demonstrated skill gap.
- Document source coverage, normalization, uncertainty, and scenario assumption basis. Team Lead must approve the public claims before `ACTIVE_SNAPSHOT_ID` points at the new package.
