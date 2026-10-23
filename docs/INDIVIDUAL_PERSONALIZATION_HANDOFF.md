# Individual personalization: API v1.0 boundary

This frontend change keeps the existing Normalize → Confirm → Recommendation contract. Interests are still sent as the existing `form.interests` list. Vision text, user-edited goal tags, work-style self-assessment, sources and confirmation flags remain local to the frontend profile. They are **not** added to strict v1.0 requests. MBTI stays optional self-reported context and is never taken from a Normalize response.

The online recommendation UI shows only `match_score` returned by the API. The backend currently owns the 45% skills / 20% interests-preferences / 20% quarterly outlook / 15% transition total. The proposed split of the existing 20% component into 8% interests, 7% vision and 5% work style is **not implemented**; no frontend subtotal is calculated or displayed. A missing optional response must be handled neutrally by a future backend policy and must not hard-exclude a role. Until then the UI warns that personalization may be less reliable and that vision/work style are not yet scored.

Backend/API review items before activating the new fields:

1. Agree on versioned Normalize and Confirm fields for vision, goal tags, work-style dimensions, explicit consent, and provenance. Reject CV-derived personality and treat MBTI as non-gating.
2. Agree on validated role-alignment tags (`interest`, `goal`, `work_style`) and provenance (`MASCO`, `curated`, `ai_generated`). The frontend only renders explicitly supplied, recognized tags; API v1.0 supplies none.
3. Define neutral missing-value rules, score explanations, and contract tests for the proposed 8/7/5 split. The backend remains the sole scorer.
4. Review `preferred_field_id`: `backend/futureproof_ai/retrieval.py` currently excludes roles outside the selected field, and `backend/app/main.py` validates that recommendation output stays in the selected field. This is a **hard filter**, not a soft boost. Decide whether to change it and update API wording/tests before describing it otherwise.
5. Test `moderate` and `fast` independently with absent personal fields, a confirmed profile, and API errors. The real frontend must never silently fall back to demo recommendations.
