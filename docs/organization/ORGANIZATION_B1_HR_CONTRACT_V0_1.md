# Organization B1 — HR/L&D Contract v0.1

## Scope

B1 is a department-first HR and learning-planning flow. It is deliberately different from B2 Career Helping Centre.

| Concern | B1 HR/L&D | B2 Career Centre |
|---|---|---|
| Primary unit | Department and optional anonymous employee | Reviewed student |
| Minimum input | Organization plus at least one department | At least one reviewed student; cohort views require a selection |
| Main output | Skill coverage, internal mobility review, training priorities | Career matches, student gaps, cohort workshops and curriculum suggestions |
| No person records | Supported; coverage is `unknown` | Not an analyzable student flow |
| Human decision boundary | Not a promotion, transfer or performance decision | Not an admissions, grading or employability decision |

Only declared fictional/synthetic records are accepted by this MVP endpoint.

## Endpoint

`POST /api/v1/organizations/hr/analyze`

The endpoint uses the existing organization workspace repository and revision compare-and-swap behavior. A new workspace starts at revision `1`; an update must provide both `workspace_id` and the latest `workspace_revision`. A stale revision returns `409 REVISION_CONFLICT`.

## Request

The request envelope remains `organization-v0.1`. The HR payload contains:

- organization label, sector, confirmed organization goal tags;
- cross-department target skill IDs;
- training budget ceiling and planning horizon;
- one or more departments with responsibilities, current status, challenges, goals, reported headcount and target skills;
- zero or more reviewed anonymous employees with department reference, current role, recorded skills, optional target role and weekly learning hours.

The frontend does not send free-text HR notes, personality descriptions, interests, aspirations or protected characteristics to the B1 scoring service.

## Deterministic calculations

### Department skill coverage

Coverage uses only employee profiles where `baseline_known=true`.

`coverage_percent = profiles_with_skill / recorded_profiles × 100`

When a department has no known baseline, the result is:

- `coverage_state: unknown`
- `coverage_percent: null`
- no invented missing-member count
- training priority `review_required`

Unknown is never treated as zero skill.

### Internal mobility

Person-level suggestions are produced only for anonymous employees with a recorded baseline:

`match_score = 60% skill compatibility + 25% scenario outlook + 15% transition feasibility`

The selected Moderate/Fast snapshot can change the scenario-outlook component. Personality, HR notes and protected characteristics are excluded. Every suggestion returns `human_review_status=required`.
An optional employee target role is used only as a deterministic tie-breaker; it does not hard-filter the role catalogue or override a higher score.

### Training priorities

Measured coverage maps to deterministic priority bands:

- below 40%: `high`
- 40% to below 75%: `medium`
- 75% or above: `low`
- unknown baseline: `review_required`

The six-hour value is explicitly a `synthetic_planning_assumption`, not a verified course duration. Budget feasibility remains `not_assessed` until verified course prices are connected.

## Frontend mapping

The existing B1 visual flow is preserved:

1. Team profile — department-first intake and optional anonymous employee CSV/manual records.
2. Skill heatmap — server coverage in Real mode; unknown cells remain blank rather than showing `0`.
3. Internal mobility — server suggestions only for reviewable anonymous profiles.
4. Enterprise training — server portfolio priorities plus local/manual training checkpoints.
5. Department overview — server summary plus manually tracked implementation status.

Demo mode keeps the existing local illustrative behavior. Real mode does not silently fall back to those local results after an API error.

## Current evidence boundary

- Role and role-skill requirements are the bundled synthetic UI-compatible catalogue.
- Scenario outlook uses the selected active snapshot.
- Evidence IDs remain traceable in the response.
- This version does not claim validated workforce demand, course cost, employee performance or promotion suitability.
