# API Contract v1.0 operational addendum: confirmation and scoring

This document clarifies existing `POST /api/v1/profiles/confirm` behavior without changing the frozen request fields. `profile_revision` is an optional additive field in runtime OpenAPI; the original v1.0 ConfirmRequest has no revision property.

| Profile state | `profile_revision` | Result |
|---|---|---|
| Unconfirmed, first review | omitted or current | Accepted; revision increments atomically. |
| Confirmed, later edit | omitted | HTTP 409 `PROFILE_REVISION_REQUIRED`; refresh the profile before retrying. |
| Any state | supplied but stale | HTTP 409 `SNAPSHOT_CONFLICT`. |
| Confirmed, later edit | current | Accepted; SQLite compare-and-swap increments revision once. |

The frontend must retain `data.profile.revision` or `data.profile_revision` after confirmation and send it on every later edit. A second tab with an older revision must show a conflict and ask the user to review current data; it must not blindly retry. Errors use the existing `{error,meta}` envelope.

Recommendation results are checked against server-owned `Profile`, role catalogue, required skill levels, selected TrendSnapshot and scenario. The internal scoring policy is versioned: `demo-v1` preserves the original Backend demo formula; `tech-v1` verifies the deterministic Tech adapter formula. A configured scoring adapter must declare `scoring_policy='tech-v1'` (or another explicitly supported policy). An unknown policy or any mismatch in score components, overall score, complete gaps, strengths, role or evidence returns HTTP 502 `MODEL_INVALID_OUTPUT` without internal exception details. This validation does not make an unapproved market source verified or turn deterministic rules into an LLM.
