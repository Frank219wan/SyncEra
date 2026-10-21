# Frontend–Backend contract gap report (Phase 3)

## Evidence and scope

Checked against the fetched SyncEra frontend at `origin/main` commit `34beee2`: `src/services/api.ts`, `src/types.ts`, `src/domain.ts`, and the running FastAPI `/openapi.json`. The specifically named frontend `API_CONTRACT.md` v0.1 and `src/data/types.ts` are absent; the actual type file is `src/types.ts`. The exact named team contract Markdown file is absent; `backend/contracts/FutureProof_AI_OpenAPI_v1_0.yaml` and the local `AI_API_CONTRACT.md` were available. No frontend file was edited in this backend integration.

The frontend defaults to `VITE_API_MODE=demo`, which makes no real analysis calls. Its `real` mode is an unfinished adapter and does **not** yet match the backend. Keep demo mode until the client changes below are implemented and tested.

| Area | Running backend | Actual `src/services/api.ts` real mode | Minimum frontend change |
|---|---|---|---|
| Trends | `GET /api/v1/trends/roles` and `/skills` return `{data:{items,next_cursor},meta}` | `GET /api/v1/trends`, expects one `TrendPackage` | Call both paths; map response data and meta. Label synthetic ranking as demo, not observed real evidence. |
| Normalize | `POST /profiles/normalize` requires `pipeline`, `input_type`, `synthetic_input`, and `study_constraints` | Sends `{profile}` | Convert UI profile and constraints to `NormalizeRequest`; retain returned `profile_id` and revision. |
| Upload | Proposed `POST /profiles/upload` uses multipart `file`, `synthetic_input`, JSON-string `study_constraints`, optional `preferred_field_id` | No upload method; frontend README says PDF/DOCX pending | Add a multipart method and review step using returned unconfirmed profile. Demo files must be synthetic. |
| Confirm | `POST /profiles/confirm` needs `profile_id`, `skills`, `reviewed_by_user=true`, and `profile_revision` | Sends `{profile}` | Send `ConfirmRequest`; handle revision conflict and unknown canonical IDs. |
| Recommendation | `POST /recommendations` needs `profile_id` and `ai_scenario`; returns `{data:{recommendations,...},meta}` | Sends full profile plus `scenario_id`, `target_role_id`; expects direct `recommendations` | Map scenario to `ai_scenario`; send confirmed `profile_id`; unwrap `data`. |
| Skill map | `POST /learning/skill-map` needs `profile_id`, `role_id`, `skill_id`, language/budget/currency | No matching real-mode method | Add method using canonical IDs. |
| Roadmap | `POST /learning/roadmap` with selected skill IDs and `StudyConstraints` | `POST /roadmaps/full` with `{constraints}` | Map UI constraints and path; treat response as generated advice, not adopted plan. |
| Progress | P1 `/progress/skills` returns 503 | Calls `/roadmaps/:id/adopt` and PATCH task endpoint | Keep adoption/task state as labelled browser-local prototype; do not claim a backend sync. |
| Organization | P1 `/organizations/{mode}/analyze` returns 503 | Calls `/organizations/analyze` | Keep organizational analysis in demo mode until P1 is implemented. |
| Envelope/errors | Success `{data,meta}`; error `{error:{code,message,details,retryable},meta:{request_id}}` | Returns JSON as requested generic type; error only uses HTTP status | Unwrap `data`, preserve `meta` provenance, and show specific errors such as `PROFILE_NOT_CONFIRMED`, `SNAPSHOT_CONFLICT`, CV errors, and 503. |

## Schema and ID mapping

- `NormalizeRequest` text and form are nullable, but a validator requires the field appropriate to `input_type`. Upload requires a **JSON string** `study_constraints` multipart field; it is not an object part.
- Backend `RecommendRequest.ai_scenario` is `moderate | fast`; frontend `Scenario` has the same values, but uses a different request key.
- Backend `ProfileSkill.source` is `declared | inferred | confirmed`, with nullable numeric `level` (0–5). Frontend `Skill.source` is `manual | cv_extracted | inferred`, with a string level and `confirmed` boolean. The client must map and validate them; no automatic proficiency inference is allowed.
- Backend uses distinct `profile_id`, `role_id`, `skill_id`, `evidence_id`, and `snapshot_id` namespaces. The frontend currently uses shorter `id`/`roleId` values and a demo `snapshotId`; these require explicit mapping to canonical IDs.
- Backend `StudyConstraints` needs `weekly_hours`, `budget_amount`, `currency`, `language`, `target_weeks`, `learning_pace`. Frontend `Constraints` uses `hours`, `budget`, `language`, `start`, `deadline`, `baseline`. The client must derive and confirm the missing values with the user.
- The generated OpenAPI declares principal P0 business errors, upload 413/415/422/502/504, and P1 503. Review uncommon infrastructure errors during contract freeze.

## Product semantics and next integration step

`/trends/skills` has no scenario or pace input. Moderate/Fast applies only to recommendation outlook under the named scenario assumptions; the default market snapshot is synthetic. The P1 progress route stores neither `activity_completed` nor `skill_confirmed`. In the current frontend demo, `src/domain.ts` increments `plan.earned` from completed task count; Frontend must label that as local visual progress or change it before treating Bamboo segments as verified skills. The smallest path to live Individual integration is a frontend API client adapter implementing upload or normalize → confirm → recommend → skill map → roadmap, then a joint test against this branch. Team Lead and Frontend must confirm the additive upload form fields before the v1 freeze.
