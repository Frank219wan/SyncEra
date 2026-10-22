# Career Radar hybrid RAG

## Decision

Career ranking and Skill Gap stay deterministic. MiniMax-M3 may generate only
the optional, grounded explanation attached to already validated recommendations.
The first version does not use embeddings or a vector database.

The DOSM market radar added in PR #15 provides occupation-group and industry
context only. It has no named position-to-skill requirements, so it remains a
separate display dataset. The current matching catalogue is labelled synthetic
until reviewed position-level skill data is supplied.

The optional MiniMax research helper can draft a named position from a DOSM
group and then draft catalogue skill requirements for that position. Both
methods are disabled by default and return `pending_review`; they do not write
to PostgreSQL or enter matching. See `docs/RADAR_LLM_MATCHING.md` at the
repository root for the two-step call contract.

## Data flow

1. `/api/v1/profiles/normalize` creates a synthetic-only profile.
2. The user confirms skills through `/api/v1/profiles/confirm`.
3. A reviewed `TrendSnapshot` supplies dated role/skill signals and Evidence IDs.
4. `retrieve_career_candidates()` performs recall-first structured retrieval.
5. `tech-v1` calculates rank, Matching Score, Skill Gap and scenarios.
6. Backend independently validates every deterministic result.
7. When `include_narrative=true`, MiniMax receives only the normalized profile,
   validated recommendation facts, and reviewed evidence metadata.
8. Backend attaches trusted Evidence IDs and mechanically rejects changed role
   order, unknown fields, URLs, numbers, guarantees, and malformed output.

The LLM never receives original CV bytes or the original CV text during Career
Radar generation. Its output cannot add or change role IDs, skill IDs, scores,
gaps, scenario inputs, Evidence IDs, URLs, or ranking. Backend cannot prove the
semantic truth of every generated sentence, so each item remains explicitly
model-generated and must include an uncertainty statement.

## Optional request

```json
{
  "profile_id": "profile_example",
  "region": "MY",
  "ai_scenario": "moderate",
  "top_k": 5,
  "snapshot_id": "snap_example",
  "include_narrative": true
}
```

`include_narrative` defaults to `false`, preserving API Contract v1.0 clients.

## Backend Preview configuration

```dotenv
AI_ADAPTER_MODULE=futureproof_ai.tencent_tokenhub_adapter
TENCENT_TOKENHUB_API_KEY=
TENCENT_TOKENHUB_MODEL=minimax-m3
CAREER_RADAR_LLM_ENABLED=true
CAREER_RADAR_MAX_TOKENS=1600
```

The same server-side TokenHub key may be reused. No browser-visible key and no
second chat-model key are required. Keep `CAREER_RADAR_LLM_ENABLED=false` until
the protected Preview is ready for a synthetic test.

## PostgreSQL

`migrations/20261022_01_career_radar.sql` defines the server-side catalogue,
role-skill, immutable snapshot, signal, scenario and evidence relationships.
It contains no profile/CV table and no vector column. The deployment branch must
apply it to a Preview database before switching the trend repository to SQL.

For a future real position import, assign a reviewed `role_id` (the `draft_`
candidate ID is never promoted directly), map it to a DOSM occupation group,
provide a named title and description, and submit each required canonical
`skill_id` with target level, importance, and independent position-level
`evidence_id`. Evidence must retain source URL, publication/collection date,
region, extraction method, and reviewer approval. The existing `career_roles`,
`role_skills`, and `evidence` tables are the storage target. The current runtime
still uses a static role catalogue; a future approved import also needs a
catalogue projection and matching-validation update before activation. Merely
writing database rows will not make new positions recommendable.

The reserved reviewer handoff shape is:

```json
{
  "role_id": "role_example_verified",
  "parent_occupation_group_id": "occupation-professionals",
  "title": "Verified named position",
  "description": "Source-backed position description",
  "region": "MY",
  "source_url": "https://source.example.org/position",
  "published_or_collected_at": "2026-10-01",
  "collected_at": "2026-10-22T00:00:00Z",
  "method_version": "position-skill-review-v1",
  "review_status": "pending_review",
  "required_skills": [
    {
      "skill_id": "skill_sql",
      "target_level": 3,
      "importance": "high",
      "evidence_id": "ev_example_verified"
    }
  ]
}
```

This is a **reserved data contract**, not an active HTTP importer; the example
URL and IDs are placeholders, not verified sources. The `review_status` must
remain `pending_review` until the real source and every requirement are checked.

Real data remains inactive until its source URL, date, region, method and reviewer
approval pass the existing `MarketRepository.import_public()` boundary.

### Repository handoff contract

The database implementation can be added later without changing the FastAPI
routes or the scoring module. Set one or more server-side module paths:

```dotenv
PROFILE_REPOSITORY_MODULE=app.postgres_repositories
MARKET_REPOSITORY_MODULE=app.postgres_repositories
RESOURCE_REPOSITORY_MODULE=app.postgres_repositories
```

That module may export these factories:

```python
def create_profile_repository(): ...
def create_market_repository(): ...
def create_resource_repository(): ...
```

The required method signatures are defined in `app/repository_ports.py`.
Profile `update(profile, expected_revision)` must remain an atomic compare-and-
swap operation and return `False` for a stale revision. An explicitly configured
module that cannot load fails application startup; it never silently falls back
to SQLite or in-memory market data.
