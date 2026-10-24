# SDC Hackathon 2026 — Skillogy Submission Guide

This is a **repository-format and submission-status guide**, based on [the organizer's template](https://github.com/michaelzhngg/SDC_Hackathon_Submission_Template). The actual product and code live in this repository, `Frank219wan/SyncEra`; its official public product name is **Skillogy**.

## Existing required submission PDFs

The following three PDFs are **already present** in the `submission/` folder of this branch. They are preserved **unchanged**, not regenerated or relabelled:

| Document | Existing file | Repository presence |
| --- | --- | --- |
| Preliminary submission | [SDC2026_SyncEra_Preliminary.pdf](../submission/SDC2026_SyncEra_Preliminary.pdf) | Present |
| Technical & tools declaration | [SDC2026_SyncEra_TechDeclaration.pdf](../submission/SDC2026_SyncEra_TechDeclaration.pdf) | Present |
| Replit proof of use | [SDC2026_SyncEra_Replit_POU.pdf](../submission/SDC2026_SyncEra_Replit_POU.pdf) | Present |

**Presence ≠ content acceptance.** File contents, team name in the filenames, PDF formatting, and organizer approval have not been independently verified in this documentation-only task. Keep the registered **team name** distinct from the product name **Skillogy** when deciding whether filenames need to change.

Per the team's current submission direction, **no RunPod deliverable, placeholder RunPod handler, or RunPod-specific documentation is added** in this reorganization. If the organizer applies a separate RunPod requirement to the team's submission, resolve it with the organizing committee rather than claiming use that did not happen.

## Official template → actual repository mapping

| Organizer template section | Skillogy location |
| --- | --- |
| `README.md` with Team Information, Links, Overview, Features, Stack, Architecture, How to Run | [Root README](../README.md) |
| `src/` | `src/` (React/TypeScript frontend), `backend/app/` (FastAPI) |
| `tests/` | `tests/` and `backend/tests/` |
| `docs/` | `docs/` (this guide, review records, diagrams, integration instructions) |
| `submission/` | Existing three PDFs plus [document index](../submission/README.md) |
| `.replit` | [Root .replit](../.replit), references `scripts/run-replit.sh`, `build-replit.sh`, `run-replit-production.sh` |
| `.env.example` | Root `.env.example` and `backend/.env.example`, containing sample values, not credentials |
| `requirements.txt` | [Root compatibility file](../requirements.txt) → `backend/requirements.txt` (actual Python backend dependencies) |
| `LICENSE` | Apache 2.0 at repository root |

**The GitHub top-level tree will not look identical to the example:** the example is a small Python app, but Skillogy's additional root folders include a React/Vite frontend, a FastAPI backend, server-side proxy and build/deploy scripts. Moving or deleting these would break existing imports, CI, Replit or Vercel without a large migration, so they stay in place. The README, all actual submission PDFs, the `src/`, `tests/`, and `docs/` entries, and a new root `requirements.txt` provide the template-aligned navigation. No production paths or package imports were moved. No RunPod folder is added at the team's request.

## Before the team submits

1. Fill the **registered Team Name**, leader, university, member count, and selected SDG track in the README. Avoid assuming the product name equals the registered team name.
2. Add the final **Slide Deck** and **5–7-minute YouTube Demo Video** links. Confirm both are accessible to judges.
3. Check all **three existing PDF contents** are final and have the correct registered team identity, signatures/fields, date/version, and official organizer template requirements.
4. Open and verify the Replit deployment URL. The Replit proof PDF exists, but a live Replit URL must be separately provided; Vercel does not prove Replit use.
5. Confirm the code repository is accessible to the committee, add organizer GitHub collaborators if required, and preserve relevant development commits.
6. Ensure submitted public URLs work in a clean browser. Protected Vercel Preview judge access must be conveyed privately; never publish a bypass credential.
7. Run the commands in the [root README](../README.md) and capture current build/test results; older CI results are not evidence of a fresh run.
8. Review environment files and commit history for secrets, private data, real CVs, employee/student records and licensed third-party materials. Declare third-party tools, AI assistance, APIs, datasets and licenses appropriately.
9. Treat market evidence and any release-completeness claims conservatively: the default demo uses synthetic fixtures and protected Preview is not equivalent to an unrestricted Production verification.

## Helpful references

- [Full original technical README](TECHNICAL_README_ARCHIVE_20261025.md)
- [Backend setup](../backend/README.md)
- [Vercel Preview API and security](VERCEL_PREVIEW_PROXY.md)
- [Individual flow test plan](TEST_PLAN_INDIVIDUAL_FIRST.md)
- [Organization cloud acceptance](organization/ORGANIZATION_B1_B2_CLOUD_ACCEPTANCE.md)
- [Event official template](https://github.com/michaelzhngg/SDC_Hackathon_Submission_Template)

The existing files are left in place for provenance; do not rename or alter PDFs solely to match example filenames.
