# FutureProof AI Organization MVP Contract v0.1

Status: B2 implemented and regression-tested locally; not deployed, committed, pushed, or approved for Production. B1 remains disabled.

Date: 2026-10-23

Local verification: `128 passed, 2 skipped`; dependency check reported no broken requirements. PostgreSQL SQL was not executed against a real Neon database in this local run.

## 1. Locked scope

- Keep one SyncEra repository and one canonical role/skill/evidence taxonomy.
- Develop on `feature/organization-mvp` and deploy only to isolated, protected Preview projects.
- Implement B2 Career Helping Center first, then B1 HR/L&D.
- Accept only explicitly fictional, pseudonymous records in the MVP.
- Career ranking, skill gaps, aggregation and arithmetic are deterministic. MiniMax may draft grounded explanations and plans only.
- No personality inference from CVs, no MBTI-based exclusion, no redundancy or dismissal ranking, and no automated employment or curriculum decision.
- PR #30 quarterly ingestion is not a dependency until its import safeguards and Preview PostgreSQL test are accepted.

## 2. Reused platform components

The Organization implementation reuses the existing API envelope, request ID, error handling, FastAPI middleware, PostgreSQL pool pattern, revision CAS, career/skill catalogue, trend snapshots, evidence IDs, deterministic gap calculations, reviewed learning resources and bounded MiniMax-call pattern.

The following Individual contracts remain shared read-only intelligence services:

- `GET /api/v1/trends/roles`
- `GET /api/v1/trends/skills`
- `GET /api/v1/roles/{role_id}`
- `GET /api/v1/roles/{role_id}/tasks`
- `GET /api/v1/evidence/{evidence_id}`
- `POST /api/v1/learning/skill-map`
- `POST /api/v1/learning/roadmap`

The A-only `Profile`, `/profiles/*` and `/recommendations` contracts are not silently reused for an institution. B2 may call the same pure scoring functions after converting one confirmed student record into an internal scoring subject, but it receives its own Organization request/response schema and provenance.

## 3. MVP endpoint

The already reserved API Contract v1.0 route becomes the first orchestration endpoint:

```http
POST /api/v1/organizations/{mode}/analyze
```

`mode` is exactly one of:

- `hr` — B1 HR/L&D
- `career_centre` — B2 TVET/university Career Helping Center

The frontend's current `tvet` state name is a UI alias only and must map to `career_centre` before the request is sent.

The endpoint creates or atomically revises a workspace, runs deterministic analysis against one selected snapshot, stores the result, and returns the saved revision. Repeating the same accepted input revision, snapshot, scenario and method version returns the existing analysis instead of charging for or generating another explanation.

## 4. Common request rules

```json
{
  "schema_version": "organization-v0.1",
  "synthetic_input": true,
  "workspace_id": null,
  "workspace_revision": null,
  "reviewed_by_user": true,
  "region": "MY",
  "locale": "zh-CN",
  "ai_scenario": "moderate",
  "snapshot_id": null,
  "payload": {}
}
```

Rules:

- `synthetic_input` and `reviewed_by_user` must be `true`.
- A create request uses `workspace_id=null` and `workspace_revision=null`.
- An update requires both values; stale `workspace_revision` returns HTTP 409.
- `snapshot_id=null` selects the current approved snapshot. The resolved ID is always returned.
- `ai_scenario` is `moderate` or `fast` and never changes observed source rows.
- Unknown skill levels remain `null`; they are not converted to zero in displays.
- Member IDs are pseudonyms matching `^[A-Za-z0-9_-]{1,80}$`. Names, emails, phone numbers, identity numbers and free-text direct identifiers are rejected.

## 5. B2 request: Career Helping Center

```json
{
  "schema_version": "organization-v0.1",
  "synthetic_input": true,
  "workspace_id": null,
  "workspace_revision": null,
  "reviewed_by_user": true,
  "region": "MY",
  "locale": "zh-CN",
  "ai_scenario": "moderate",
  "snapshot_id": null,
  "payload": {
    "institution_label": "Synthetic TVET College",
    "selected_member_ids": ["STU-001", "STU-002"],
    "members": [
      {
        "member_id": "STU-001",
        "programme": "Diploma in Information Systems",
        "year_or_cohort": "Year 2",
        "current_courses": ["Database Fundamentals"],
        "skills": [
          {
            "skill_id": "skill_sql",
            "level": 2,
            "source": "confirmed",
            "confidence": 1.0
          }
        ],
        "interests": ["data"],
        "goal_tags": ["entry_level_data_role"],
        "work_style": {
          "collaboration": "balanced",
          "pace": "structured",
          "structure": "guided"
        },
        "target_role_id": null,
        "weekly_learning_hours": 5,
        "reviewed": true
      }
    ]
  }
}
```

B2 validation:

- Every selected ID must exist exactly once in `members` and have `reviewed=true`.
- A course taken is not proof of proficiency; only submitted skill evidence creates a current skill record.
- One selected member is enough for student recommendations. Institutional aggregation requires at least two complete synthetic members in the hackathon Preview; Production requires a separately approved privacy threshold.
- Preferred roles, interests, goals and work style are soft signals and never remove a role from the candidate set.

## 6. B2 deterministic scoring v0.1

For each selected member and eligible role:

```text
match_score =
    0.45 * skill_compatibility
  + 0.08 * interest_alignment
  + 0.07 * goal_alignment
  + 0.05 * work_style_alignment
  + 0.20 * scenario_outlook
  + 0.15 * transition_feasibility
```

- `skill_compatibility`, `scenario_outlook` and `transition_feasibility` reuse the server-owned Individual calculation primitives.
- Interest, goal and work-style matching require role-side tags with `source = MASCO | curated | ai_generated`.
- A missing personal dimension receives a neutral component value of 50, is listed in `missing_inputs`, and lowers `result_confidence`; it is never inferred from a CV.
- Skill gaps are the catalogue requirements whose confirmed level is missing or below target. The server recalculates them independently of any model output.
- Ordering is deterministic: total score, skill score, outlook, transition feasibility, then `role_id`.
- `scoring_policy` is `organization-b2-v0.1`; it must not be presented as empirically calibrated employability probability.

## 7. B2 response

```json
{
  "data": {
    "workspace_id": "org_0123456789abcdef",
    "workspace_revision": 1,
    "analysis_id": "organalysis_0123456789abcdef",
    "mode": "career_centre",
    "snapshot_id": "snap_demo_fixture_v1",
    "ai_scenario": "moderate",
    "scoring_policy": "organization-b2-v0.1",
    "student_results": [
      {
        "member_id": "STU-001",
        "recommendations": [],
        "selected_role_id": null,
        "action_plan": null,
        "missing_inputs": [],
        "result_confidence": "medium"
      }
    ],
    "cohort_result": {
      "included_member_ids": ["STU-001", "STU-002"],
      "skill_gap_counts": [],
      "proposed_workshops": [],
      "tutoring_focus": [],
      "curriculum_supplements": [],
      "human_review_status": "required"
    },
    "warnings": []
  },
  "meta": {
    "request_id": "req_xxx",
    "snapshot_id": "snap_demo_fixture_v1",
    "data_label": "synthetic_demo",
    "is_mock": true,
    "model_version": "rules-only"
  }
}
```

The model may populate prose inside `action_plan` or institutional proposals only after deterministic IDs, scores and gaps exist. Model output may reference only supplied `role_id`, `skill_id`, `evidence_id` and approved resource IDs. Invalid output degrades to rule-only results without changing scores.

## 8. B1 reserved request and result

B1 uses the same common envelope. Its payload is department-first; employee records are optional:

```json
{
  "organization_label": "Synthetic Employer",
  "sector": "services",
  "organization_goal_tags": ["digital_transformation"],
  "budget_amount": 10000,
  "target_weeks": 12,
  "departments": [
    {
      "department_id": "dept_ops",
      "label": "Operations",
      "responsibilities": "Synthetic operational responsibilities",
      "current_status": "stable",
      "challenges": "Synthetic workflow challenge",
      "goal_tags": ["data_literacy"],
      "headcount": 20
    }
  ],
  "members": []
}
```

B1 returns department-level skill heatmaps, evidence-linked capability priorities, rule-based mobility/training feasibility and enterprise training-path drafts. It never returns redundancy risk, dismissal likelihood, protected-trait inference or an employment decision. Named member output remains disabled unless a later authorization contract adds tenant authentication and explicit access control.

## 9. Persistence and idempotency

Migration `20261023_04_organization_mvp.sql` defines:

- `organization_workspaces` — latest confirmed synthetic input with revision CAS.
- `organization_analyses` — immutable result per input revision/snapshot/scenario/method.
- `organization_plan_versions` — reviewable student, institutional or enterprise plan versions.
- `organization_analysis_calls` — hashed paid-call reservation/result ledger; no prompt or raw member text.

The database URL is server-only. Browsers never connect to Neon directly. Preview refuses SQLite fallback.

## 10. MiniMax boundary

No new key is required for rules-only development. Live Preview may use a separate Organization key for budget and audit isolation.

Allowed model tasks:

- Explain a validated student recommendation.
- Draft a next-semester action plan using approved IDs and resources.
- Draft thresholded institutional workshop/curriculum suggestions.
- Explain B1 heatmap or mobility feasibility and draft a training sequence.

Forbidden model tasks:

- Generate or alter ranking scores and skill gaps.
- Invent role, skill, evidence, course or resource IDs.
- Infer personality, protected attributes, employability, redundancy or dismissal risk.
- Receive unreviewed real student/employee records in the hackathon Preview.

Every paid call follows the existing bounded-call pattern: deterministic input hash, durable claim before request, no automatic retry, strict JSON validation, cached completion and rule-only fallback.

## 11. Vercel Preview wiring requirements

Before the endpoint can be reached from the current frontend:

1. Add `organizations/hr/analyze` and `organizations/career_centre/analyze` to the same-origin proxy POST allowlist.
2. Replace the proxy's team-specific backend-host regular expression with an explicit server-side allowlist for the approved Organization backend origin.
3. Keep the proxy Preview-only, authenticated and size/rate limited.
4. Configure Backend `PROFILE_STORE=postgres`, an isolated `DATABASE_URL`, exact `FRONTEND_ORIGINS` and `ENABLE_ORGANIZATION_MVP=1`.
5. Map frontend actor `tvet` to API mode `career_centre`.
6. Do not enable Git auto-deployment or Production promotion until synthetic E2E evidence is reviewed.

## 12. B2-first acceptance sequence

1. Create a synthetic B2 workspace and receive revision 1.
2. Read the stored workspace through a server-authorized test path.
3. Re-submit with revision 1 and receive revision 2.
4. Reject a concurrent stale revision with HTTP 409.
5. Resolve one approved snapshot and return its ID and evidence provenance.
6. Produce reproducible role scores and skill gaps for every selected student.
7. Repeat the same request and return the same stored analysis without another paid call.
8. Aggregate only selected, complete, pseudonymous records.
9. Return rule-only results when MiniMax is disabled or fails.
10. Persist after a new serverless instance and expose no database or provider secret.

Only after these checks pass should B1 reuse the same workspace, analysis and plan infrastructure.
