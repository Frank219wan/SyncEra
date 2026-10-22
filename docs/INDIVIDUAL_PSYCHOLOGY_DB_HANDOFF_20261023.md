# Individual full-flow integration status — 2026-10-23

## Source-of-truth
Portal A follows Profile → optional 5-scenario reflection → normalize → confirm (CAS) → source-dated market recommendations → role/task skill gaps → one-skill Mind Map → constraint-aware Roadmap. Based on the team's MASCO/DOSM/MiniMax handoff. Demo personal data is synthetic only.

## This branch
- Adds five English scenario prompts in `PsychologyAssessmentForm` to existing Individual profile form.
- Stores optional answers on `Profile.psychology` and submits them through existing `POST /profiles/normalize`. Backend validates keys A–E, E open text and length.
- Keeps psychology self-reported and nonclinical; career scores remain the original deterministic 45/20/20/15 formulation.
- Includes backend model-level tests and explicit Postgres connection pool dependency.
- The existing Postgres profile store writes `Profile.model_dump_json()` into `public.profiles.body`, with revision CAS updates.
- A clearly fictional record `profile_synthetic_psychology_oct23` was inserted and returned on Neon Preview; it does not prove a deployed end-to-end browser round trip.

## Still requires acceptance
- Vercel Backend Preview environment must point to Neon Preview (`PROFILE_STORE=postgres`, `DATABASE_URL` as server-only secret). No production promotion.
- Execute frontend `pnpm build` and backend `pytest`, and validate real browser → Backend → Neon flow.
- MASCO role and tasks, DOSM demand levels, MiniMax-derived skill records need distinct provenance, versioning and ingestion QA before being called real market matching. Do not treat group-level DOSM postings as job-level figures.
- Optional psychological support preferences remain an enhancement; data capture is wired, but current Roadmap scheduling is not yet modified by responses.
- No actual user psychological data is part of hackathon demo.

## PR #19 persistence repair and verification

- PDF/DOCX upload retains its existing Profile ID in frontend state, including after returning from Review to edit the optional assessment. Confirm sends the five answer slots, explicit skipped (`null`) choices, E open responses, consent flag and existing `profile_revision` to the same profile. The upload is not extracted again merely to save questionnaire edits.
- Confirm treats psychology as an optional replacement: omission preserves the stored assessment; an explicit cleared assessment removes answers and Other responses and sets consent false. The PostgreSQL store's existing `UPDATE ... WHERE profile_id AND revision` commits skills and psychology in one CAS write. A stale revision returns HTTP 409.
- Source boundaries from the target branch remain separate: MASCO role/task classifications, dated DOSM market signals, provenance-labelled MiniMax narrative/skill generation, and deterministic career scoring/gaps. No scoring weights were changed by this repair. Pending market records remain pending.
- Local verification after merging `integration/career-radar-dosm-pr15`: Frontend TypeScript, 57 tests and Vite build PASS; Backend 123 tests PASS, 2 PostgreSQL tests SKIPPED because `TEST_DATABASE_URL` was not configured; local cross-stack tests 2 PASS against a temporary rule-adapter backend. The CV/Psychology test compares recommendation scores before and after clearing the assessment and exercises Skill Map/Roadmap and stale Revision 409.
- `test_synthetic_cv_psychology_confirm_postgres_readback` is ready for an isolated Neon test database, but was **not run** in this session. Protected Vercel Preview E2E was **not run**. No paid MiniMax call or Production change was made.
