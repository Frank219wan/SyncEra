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
