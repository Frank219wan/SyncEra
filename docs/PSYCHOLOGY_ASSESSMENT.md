# Individual growth reflection

## Flow and API

Individual profile entry now goes through the optional `Understanding Your Growth Journey` questionnaire before profile normalization and confirmation. The five English situation, question, and answer texts are in `src/psychologyAssessment.ts`; the questionnaire is a single-question-at-a-time route at `/individual/intake/assessment`.

The assessment uses the existing `/api/v1/profiles/normalize` and `/api/v1/profiles/confirm` requests. It is stored inside `psychology.assessment`; no endpoint was added. Existing `mbti`, `character_notes`, `adaptability_self_report`, and `intrinsic_motivators` fields are carried through the TypeScript request adapters and Pydantic model. `other_responses` is sent only for answers marked `E`. A skipped question is `null`; skipping the whole assessment sends `assessment: null` and does not block onboarding.

Validation requires all five scenario keys, accepts only `A`–`E` or `null`, requires nonblank text for `E`, and rejects free text attached to another option. The written text is preserved as entered. The app does not log it or send it to an LLM or other third-party provider. In the current app, profile state is also saved in browser local storage. A change made after normalization is included when the user confirms the profile.

## Presentation-only support adapter

`src/psychologySupport.ts` maps consented, answered responses to optional support preferences and reflective messages. These are product heuristics for displaying the learning pathway. The adapter is used by the Individual roadmap draft and adopted journey to highlight a manageable first task, and to show the user relevant guidance.

| Response | Presentation heuristic |
| --- | --- |
| S1 A, D; S2 A; or S5 A, B, C | Prefer one small first action; highlight it in the roadmap. |
| S1 A/B, S2 A/B, S3 D, or S5 A/B | Use clearer guidance and structured milestones. |
| S1 C or S2 B/C | Connect new learning to skills and experience already present in the profile. |
| S2 D | Explain why a skill is included before adding it to the pathway. |
| S3 A/B/D | Keep user choices visible and focus on actions they control. |
| S4 A/B/C/D | Emphasize practical outcomes, mastery checkpoints, purpose, or pathway flexibility respectively. |
| S5 D | Use a clear roadmap and milestones while leaving the default step size unchanged. |

The mapping does not produce a score or personality label. `E` does not receive an automatic interpretation. An assessment with no answered questions produces no support preferences. The adapter does not alter role eligibility, recommendation scores, disruption assumptions (`moderate` / `fast`), market evidence, or backend roadmap calculations. The backend stores the validated self-report but does not interpret it.

## Demo fixture and privacy boundary

`sampleProfile` contains a fictional profile with all five synthetic answers populated so the demo can show the support panel. The assessment remains optional for real onboarding and can be edited or cleared. Clearing or changing a previously normalized assessment is applied to the server profile on the existing confirmation step; abandoning that edit before confirmation leaves the previously confirmed server profile unchanged.

The questionnaire is not a clinical or psychological diagnosis. It must not be used as a hard career filter, a mental-health risk score, or a reason to reduce a career match score. Organization B1/B2 views and public career-trend endpoints do not receive individual assessment answers.
