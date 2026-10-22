# Career radar to CV-skill matching handoff

## Current radar inputs

The local radar uses the `e2-Summary Table BI` sheet in the JMI workbook and `QES_QUARTER` in the Employment Statistics workbook. JMI contributes ad counts by industry and DOSM major occupation group. QES contributes employment and broad occupational skill-tier context.

The JMI records expose stable IDs, selected quarter, ad count, market share, quarter/year changes, and evidence coordinates (`source_id`, `source_row`). The workbook does not contain named vacancies/job titles or named required skills. QES skill levels (`Skilled`, `Semi-skilled`, `Low-skilled`) describe broad occupational tiers and cannot stand in for competencies.

## Current synthetic Individual closure

Until a reviewed title-to-skill source is supplied, the runnable path is
synthetic CV text → catalogue skill extraction → user confirmation → structured
retrieval against the existing synthetic `role_id` / `skill_id` catalogue →
deterministic `tech-v1` score and Skill Gap → optional MiniMax explanation →
Skill Map and Roadmap. The DOSM occupation-group snapshot is a separate market
view. Its `snapshot_id` and occupation IDs are not interchangeable with the
matching Snapshot IDs and role IDs. No DOSM job-ad count contributes to a
specific career score or to a Skill Gap.

The radar API therefore returns `matching_readiness.evidence_based_matching_ready: false`, with the missing position and skill evidence stated explicitly. The UI presents major occupation groups as market signals, not as individual job titles or role requirements.

## Future adapter input

Use a minimal, normalized payload. Send confirmed skill IDs and levels from the individual's reviewed profile; do not send the raw CV to the LLM by default. Keep source and confidence with each skill, and include the current radar snapshot plus source lineage for each position candidate.

```json
{
  "snapshot": {
    "snapshot_id": "dosm-market-q2-2026",
    "period": "2026-Q2",
    "region": "MY"
  },
  "candidate": {
    "skills": [
      {
        "skill_id": "skill_python",
        "level": 3,
        "source": "cv_extracted",
        "confidence": 0.92,
        "confirmed": true
      }
    ]
  },
  "position_candidate": {
    "id": "occupation-professionals",
    "title": null,
    "occupation_group": "Professionals",
    "taxonomy_level": "major_occupation_group",
    "required_skills": [],
    "market_signal": {
      "period": "2026-Q2",
      "postings": 285907,
      "market_share_percent": 51.5,
      "yoy_change_percent": 121.6
    },
    "evidence": {
      "source_id": "dosm-jmi-q2-2026",
      "source_row": 36
    },
    "match_status": "insufficient_position_skill_evidence"
  }
}
```

This example describes the contract shape only; it is not a match recommendation. With the current data, the adapter must not produce a fit score, skill gaps, or a claim that the individual qualifies for a specific job.

## Data needed before matching

Add a reviewed source with specific job titles linked to a consistent occupation taxonomy and evidence-backed skill requirements or skill mentions per title. Retain source URL, publication or observation dates, region, extraction method/version, and the original source ID for each requirement. Only after those fields exist should the app use title-level candidates in live matching.

The internal MiniMax adapter provides a **two-step research aid** when
`POSITION_SKILL_DRAFTS_ENABLED=true`:

1. `propose_named_positions("occupation-professionals")` accepts a real DOSM
   occupation-group ID and returns plausible named jobs with stable `draft_` IDs.
   These jobs are **model hypotheses**, not DOSM job titles or sourced market
   observations.
2. `propose_position_skills({position_id, title, taxonomy_level:
   "named_position"})` suggests only canonical `skill_id` values, tentative
   target levels, importance, and rationale. Passing a DOSM major-group record
   directly is rejected.

Both steps return `status: pending_review`. Neither writes the catalogue or
changes scores. The existing `TENCENT_TOKENHUB_API_KEY` can serve both calls;
no second matching key is required. The methods are internal, not public API
endpoints. A reviewer must verify each named position and each skill
requirement against independent position-level evidence before an import can
affect recommendations. Without such evidence the synthetic Individual
catalogue remains the only matching source.

The matching adapter should return structured matched skills and gaps, cite the position evidence IDs, distinguish CV-extracted from user-confirmed skills, and abstain when the position requirements or candidate skill levels are missing. Any displayed result should be an evidence-based fit explanation, not a hiring probability.
