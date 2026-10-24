# Organization B2 Frontend Integration Guide

Status: implemented locally against the existing `src/pages/Organization.tsx` design and regression-tested. It has not been committed, pushed, or deployed.

Local verification on 2026-10-23:

- Frontend: 85 tests passed on the latest `main` baseline, including the V1.3 radar comparison checks.
- Frontend production build: passed.
- Backend: 129 tests passed, 3 skipped (the added Organization PostgreSQL test requires an isolated `TEST_DATABASE_URL`).
- Python dependency check: no broken requirements.

## 1. Preserve the existing design

Keep the current routes and visual modules:

- `/organization/tvet/students`
- `/organization/tvet/trends`
- `/organization/tvet/gaps`
- `/organization/tvet/cohort`
- `/organization/tvet/insights`

Do not replace the existing student selector, career card, gap chips, three action-plan cards, cohort gap bars, workshop cards, tutoring list, or curriculum supplement cards. The B2 response was shaped to populate those modules directly.

The UI label may remain `TVET` internally for this release. Only the API path maps it to Contract mode `career_centre`.

## 2. Required state separation

Do not replace the editable `Organization` object with an API result. Inputs and analysis are different state.

The implementation keeps these optional fields on `Organization`:

```ts
workspaceId?: string;
workspaceRevision?: number;
analysis?: ApiOrganizationAnalysis | null;
analysisScenario?: 'moderate' | 'fast';
analysisSnapshotId?: string;
```

After success, preserve `people`, `selected`, institution fields and local revisions:

```ts
setState(current => ({
  ...current,
  tvet: {
    ...current.tvet,
    workspaceId: result.workspace_id,
    workspaceRevision: result.workspace_revision,
    analysis: result,
    analysisScenario: state.scenario,
    analysisSnapshotId: result.snapshot_id,
    analyzedRevision: current.tvet.revision,
  },
}));
```

This replaces the current `setState(...[kind]: result)` behavior, which would destroy editable input state.

## 3. Add contract types and mapper

Organization request/response types and mappers are implemented in `src/services/api-contract.ts` using the existing helpers:

- `toContractRoleId()`
- `fromContractRoleId()`
- `toContractSkillId()`
- `fromContractSkillId()`

Map the existing B2 fields as follows:

| Existing UI field | API field |
|---|---|
| `org.name` | `payload.institution_label` |
| `person.id` | `member_id` |
| `person.department` | `programme` |
| `person.year` | `year_or_cohort` |
| comma-separated `person.courses` | `current_courses[]` |
| `person.skills[]` | `skills[].skill_id` |
| `person.interests` | `interests[]` |
| structured goal chips | `goal_tags[]` |
| structured work-style selectors | `work_style` |
| `person.target` | `target_role_id` |
| `person.hours` | `weekly_learning_hours` |
| `org.selected[]` | `selected_member_ids[]` |

The request must include:

```ts
{
  schema_version: 'organization-v0.1',
  synthetic_input: true,
  workspace_id: org.workspaceId ?? null,
  workspace_revision: org.workspaceRevision ?? null,
  reviewed_by_user: true,
  region: 'MY',
  locale,
  ai_scenario: scenario,
  snapshot_id: requestedSnapshotId ?? null,
  payload: { ... }
}
```

For the first student-level analysis, send every complete, reviewed synthetic student so the `trends` and `gaps` selector has results. For the institutional `insights` request, send exactly `org.selected` and retain the existing minimum-two-students rule.

## 4. Input additions inside the existing PersonEditor

The current UI retains free-text `traits` and `aspiration`, while the scored values use compact, user-confirmed structured controls below those fields:

1. Skill level beside each selected skill: `unknown`, `1` to `5`. Do not silently turn a recorded skill into level 3.
2. Goal chips such as `entry_level_data_role`, `digital_transformation`, `social_impact`, and `service_quality`.
3. Work-style selectors:
   - collaboration: `independent`, `balanced`, `collaborative`
   - pace: `structured`, `balanced`, `fast`
   - structure: `guided`, `flexible`, `independent`
4. A reviewed checkbox for each synthetic record.

Do not infer these values from CV text, `traits`, MBTI, programme, or course names. Free text may remain visible as adviser context but must not be converted to scored tags without user confirmation.

## 5. Page-to-response binding

| Existing page/module | Backend response |
|---|---|
| Student selector | `student_results[].member_id` |
| Career direction card | selected recommendation matching `selected_role_id` |
| Recommended-career cards | `student_results[].recommendations` |
| Score badge/details | `match_score` and six `score_breakdown` fields |
| Strength chips | `strengths[]` |
| Skills to develop | `skill_gaps[]` |
| Three action cards | `action_plan.next_semester_courses`, `self_study_topics`, `project_or_internship` |
| Cohort gap bars | `cohort_result.skill_gap_counts` |
| Workshop cards | `cohort_result.proposed_workshops` |
| Tutoring priorities | `cohort_result.tutoring_focus` |
| Curriculum supplements | `cohort_result.curriculum_supplements` |
| Limitations banner | `warnings[]`, `result_confidence`, `missing_inputs[]` |

Use `member_ids` from each cohort gap when opening the existing rationale modal. Do not recompute the server result with `cohortGaps()` in Real mode.

## 6. API service change

`api.organization()` now returns the mapped Organization analysis and response metadata rather than replacing the editable `Organization` object.

In Real mode it must call:

```text
POST /api/v1/organizations/career_centre/analyze
```

In Demo mode, the old local calculator may remain clearly labelled. Real-mode failures must show the actual error and must not fall back to local recommendations.

`/api/v1/organizations/career_centre/analyze` is in the exact server proxy POST allowlist. The proxy also rejects requests unless `synthetic_input` is exactly `true`; HR remains disabled.

## 7. Scenario and provenance UI

Reuse the existing Moderate/Fast visual language from Individual. Put a scenario selector in the B2 `trends` header and show:

- resolved `snapshot_id`;
- `scoring_policy = organization-b2-v0.1`;
- `data_label` and `is_mock` from the envelope;
- `curated` tag source;
- a short statement that scores are deterministic guidance, not employability probabilities.

Changing the scenario makes the old analysis stale and requires an explicit re-run.

## 8. Error handling

- `409 REVISION_CONFLICT`: keep the local draft, show a conflict banner, and offer an explicit new-analysis action that clears `workspaceId` and `workspaceRevision`. Do not silently overwrite.
- `422 VALIDATION_ERROR`: focus or link to the incomplete student record.
- `503 SOURCE_UNAVAILABLE`: explain that Organization Preview is disabled or not connected; keep input locally.
- Network/5xx: show retry without demo fallback.

## 9. Preview deployment requirements

Backend Preview requires:

```text
PROFILE_STORE=postgres
DATABASE_URL=<server-side Neon URL with sslmode=require>
ENABLE_ORGANIZATION_MVP=1
FRONTEND_ORIGINS=<exact approved HTTPS frontend origin>
```

Apply `backend/migrations/20261023_04_organization_mvp.sql` before enabling the flag. The API intentionally fails startup if Organization is enabled on Vercel without PostgreSQL or without the Organization schema.

No new MiniMax key is required for this B2 scoring release. The current endpoint is rules-only; MiniMax explanation generation remains a separately gated later change.

## 10. Frontend acceptance checks

1. Editing student inputs makes existing analysis stale.
2. Student analysis preserves all editable fields after the response.
3. Moderate and Fast visibly change at least one score without changing recorded skills.
4. The target role appears in the student result even when it is not top-ranked.
5. Unknown skill level is displayed as unknown, not zero.
6. Insights use only manually selected complete students.
7. Gap bar counts and member rationale come from the server response.
8. Real API errors never produce local demo recommendations.
9. A stale workspace revision produces a visible 409 conflict.
10. Refreshing a deep Organization URL still works through Vercel SPA routing.
