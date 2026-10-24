# Skillogy — AI Career Intelligence & Personalized Reskilling

> An AI-era career guidance and skills-development platform for individuals, HR/L&D teams, and TVET/university career centres, with explainable choices and practical learning plans.

**SDC Hackathon 2026 · Domain 1** · **Product name: Skillogy**

[Public website](https://syncera-frontend.vercel.app/) · [Source repository](https://github.com/Frank219wan/SyncEra) · [Submission documents](submission/README.md) · [Submission guide](docs/SDC_SUBMISSION_GUIDE.md)

The existing repository URL remains **SyncEra** for compatibility; it is not the current product branding. Skillogy was previously referred to as FutureProof AI during development.

> **Demo and evidence boundary:** The frontend supports interactive synthetic demonstrations. Individual (A), HR/L&D (B1), and TVET/Career Centre (B2) paths are implemented in the shared application and have protected Preview integration records. Public Production functionality must be assessed independently: the public homepage alone does not prove every Real API path is deployed or accessible. Do **not** submit real CVs, employee data or student records.

---

## Team Information

| Field | Details |
| --- | --- |
| **Team Name** | **TBD — registered team name to confirm** (submission PDFs currently use `SyncEra` in filenames) |
| **Team Domain** | **Domain 1** |
| **SDG Track (1–17)** | **TBD — confirm registered track**; solution has relevant SDG 4 (Quality Education) and SDG 8 (Decent Work) connections |
| **Team Leader** | **TBD** |
| **University** | **TBD** |
| **Number of Members** | **TBD** |

## Links

| Resource | Link / status |
| --- | --- |
| GitHub Repository | [Frank219wan/SyncEra](https://github.com/Frank219wan/SyncEra) |
| Public Website | [syncera-frontend.vercel.app](https://syncera-frontend.vercel.app/) |
| Replit Live Demo | **TBD — insert actual working Replit deployment link** |
| Full-stack Preview | Protected Vercel Frontend Preview; access shared privately with authorized judges (never post bypass tokens) |
| Slide Deck | **TBD — add final judge-accessible deck link** |
| Demo Video (5–7 min) | **TBD — add final YouTube link** |

---

## Overview

### Problem

AI adoption and shifting skill requirements create uncertainty for learners and working professionals. Organizations need to identify workforce capability gaps, while education providers need clearer feedback on student skills and career readiness. Existing generic advice can be difficult to turn into an achievable, evidence-aware learning plan.

### Solution

**Skillogy** organizes declared skills and interests into a user-confirmed profile, combines it with structured career/skills signals, and presents **explainable role matches, skill gaps and learning paths**. Users explore **Moderate** and **Fast** AI-change scenarios without treating those assumptions as facts. Its organization routes use the shared analysis foundation for skills planning and cohort advice, not automated hiring or redundancy decisions.

### Key Features

1. **A — Individual:** Profile review, Career Radar, Career Atlas matches, role/task details, Skill Mind Maps, roadmaps and bamboo-inspired personal progress.
2. **B1 — HR / L&D:** Department capability and skills-gap insights, internal mobility alternatives, and training priorities for fictional workforce cases.
3. **B2 — TVET / Career Centre:** Student and cohort career exploration, skill gaps, workshop and curriculum improvement suggestions using fictional examples.
4. **Transparency:** Rule-validated scores, visible uncertainty, distinct market vs individual-fit reasoning, and clearly labelled demo/synthetic information.
5. **Accessibility:** Responsive web UI and English, Simplified Chinese and Bahasa Melayu interfaces.

The present prototype is **decision support**, not a prediction of hiring probability, an official job-demand forecast, or a professional certification system.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Backend | Python 3.10+, FastAPI, validated JSON contracts |
| Recommendation / AI | Deterministic scoring and rules; optional gated MiniMax extraction/narrative for approved protected synthetic testing |
| Data | Synthetic fixtures by default; local SQLite and isolated Neon/PostgreSQL for selected protected Preview workflows |
| Dev / Deployment | Existing Replit startup scripts; Vercel Frontend and Backend projects, server-side same-origin API proxy |
| Testing | Frontend Node tests, backend pytest, API-contract and cross-stack checks |

### Architecture

```text
                       SKILLOGY
              React / TypeScript / Vite
                  EN · ZH · Bahasa Melayu
                           |
             +-------------+-------------+
             |                           |
        Individual A               Organization B
             |                      HR B1 / TVET B2
             +-------------+-------------+
                           |
                     /api/v1/*
                           |
                Vercel proxy / API
                           |
                  FastAPI Backend
               /         |           \
        Profile data   Role/skill    Learning plans
        (fictional)    matching         & gaps
               \         |           /
                  Rule-validated outputs
                           |
                  Local / protected store
```

Current architecture details: [Vercel Preview Proxy](docs/VERCEL_PREVIEW_PROXY.md) · [Backend](backend/README.md). Protected Preview data, credentials and access controls must not be copied into the public browser build.

---

## Project Structure

The official SDC example uses a simple Python app. Our existing React + FastAPI source is preserved rather than moved into incompatible sample paths.

```text
SyncEra/
├── src/                            # Actual Skillogy React frontend
├── backend/
│   ├── app/                        # FastAPI routes, services, models
│   ├── futureproof_ai/             # Legacy import-compatible Python package
│   ├── tests/                      # Backend tests
│   └── requirements.txt            # Python dependencies
├── api/                            # Server-side Vercel frontend API proxy
├── public/                         # Brand images/assets
├── tests/                          # Frontend and integration tests
├── docs/
│   ├── SDC_SUBMISSION_GUIDE.md     # Official template mapping/checklist
│   ├── TECHNICAL_README_ARCHIVE_20261025.md
│   └── ...                         # Architecture, QA and release evidence
├── submission/
│   ├── SDC2026_SyncEra_Preliminary.pdf
│   ├── SDC2026_SyncEra_TechDeclaration.pdf
│   ├── SDC2026_SyncEra_Replit_POU.pdf
│   └── README.md                   # Existing-PDF index
├── scripts/                        # Replit build/development/production scripts
├── .replit                         # Replit launcher
├── .env.example                    # Safe non-secret examples
├── requirements.txt                # Root Python deps wrapper for SDC template
├── package.json / pnpm-lock.yaml   # Frontend tooling
├── vercel.json                     # Vercel deployment config
├── LICENSE                         # Apache-2.0
└── README.md
```

**Why this root view has more folders than the template:** the organizer's sample is a minimal Python-only example, while Skillogy is a working React + FastAPI monorepo. The top-level `src/` contains the frontend, `backend/` holds the Python API, and `api/`, `public/`, `scripts/`, `server/`, `index.html`, Vite and pnpm files are used by building or deploying the full-stack app. The repository therefore preserves those extra paths rather than breaking imports and Vercel/Replit configuration to mimic an illustrative tree. `requirements.txt` is now present at the root and delegates to `backend/requirements.txt`. The only sample component intentionally omitted per the team's instruction is RunPod.

---

## How to Run

### Option 1 — Replit

Import [this repository](https://github.com/Frank219wan/SyncEra) into Replit. The committed [`.replit`](.replit) runs `scripts/run-replit.sh` and has corresponding deployment build/start scripts. It requires a Replit environment with Node.js, pnpm/Corepack and Python. Use **fictional sample inputs only**.

A [Replit proof-of-use PDF](submission/SDC2026_SyncEra_Replit_POU.pdf) is present. Its contents have not been independently audited here. **Add the actual Replit demo URL in Links** and verify a fresh browser can open it; the public Vercel site alone is not Replit evidence.

### Option 2 — Run Locally

Requirements: **Node.js 22+**, Corepack/pnpm, **Python 3.10+** (for backend).

```bash
git clone https://github.com/Frank219wan/SyncEra.git
cd SyncEra
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The frontend starts in **synthetic Demo mode** by default. Its pages may be explored without an LLM key or live backend.

To run FastAPI separately:

```bash
cd backend
python -m venv .venv
# Activate .venv (Windows: .venv\Scripts\activate; macOS/Linux: source .venv/bin/activate)
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Backend health: `http://127.0.0.1:8000/api/v1/health`. **Real API Mode** (`VITE_API_MODE=real`) requires an appropriate same-origin proxy and correctly configured backend; merely launching the two dev servers does not prove the Vercel Preview integration.

### Run Tests

```bash
# At repository root
corepack pnpm test
corepack pnpm build

# Backend tests
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest tests -q
```

These are the repository's test commands, not a claim that they have been freshly rerun by this documentation-only change. See the [Individual-first test plan](docs/TEST_PLAN_INDIVIDUAL_FIRST.md) and [Organization cloud acceptance log](docs/organization/ORGANIZATION_B1_B2_CLOUD_ACCEPTANCE.md) for historic scope, limitations and unresolved checks.

---

## How We Use Replit *(Submission Required)*

- The repository includes a runnable **root `.replit`** file and separate development, build and production launch scripts.
- The team's existing [Replit Proof of Use](submission/SDC2026_SyncEra_Replit_POU.pdf) is preserved in `submission/`; verify its evidence/screenshots before final submission.
- Record the actual public or judge-accessible Replit deployment link above and verify it loads using a fresh session.
- Secrets, if needed, should be configured with Replit Secrets; never commit credentials or put them in `VITE_*` environment variables.

---

## Challenges & Learnings

- **Evidence provenance:** Match scoring and labour-market indications must remain distinct. Unapproved datasets or fabricated figures must not be described as observed current demand.
- **Integration and consistency:** The React app, server contracts, scenario snapshots and role identifiers must agree; failures and stale responses should not silently show demo results.
- **Privacy and deploy controls:** Real CV/student/workforce information requires safeguards not provided by the synthetic Hackathon flow. Protected Preview deployments and their access tokens are not public production guarantees.

## Future Improvements

- [ ] Complete and independently verify Production deployment of applicable Real API flows and their access controls.
- [ ] Activate only reviewed/approved public market evidence and vetted resources, with date, geography and coverage metadata.
- [ ] Improve durable progress tracking, team/education review and operational monitoring where supported by permissions and real data governance.

---

## Team

| Name | Role | GitHub |
| --- | --- | --- |
| **TBD** | Team Lead / Integration | TBD |
| **TBD** | Frontend / UI | TBD |
| **TBD** | Backend | TBD |
| **TBD** | AI / Technical | TBD |

Fill this table with registered participants only; update the row count to match the official team roster.

---

## Submission Checklist

- [ ] Confirm registered **team name**, leader, university, team count and primary SDG track in this README.
- [ ] Add the **Slide Deck** link and verify judge permissions.
- [ ] Add the **5–7-minute YouTube Demo Video** link and verify playback.
- [x] Preliminary PDF exists: [SDC2026_SyncEra_Preliminary.pdf](submission/SDC2026_SyncEra_Preliminary.pdf).
- [x] Technical declaration PDF exists: [SDC2026_SyncEra_TechDeclaration.pdf](submission/SDC2026_SyncEra_TechDeclaration.pdf).
- [x] Replit Proof of Use PDF exists: [SDC2026_SyncEra_Replit_POU.pdf](submission/SDC2026_SyncEra_Replit_POU.pdf).
- [ ] Confirm the content, registered team identity and organizer-required naming of those PDFs (no PDF modifications were made).
- [ ] Add/verify a working Replit URL and confirm the submitted live demo works.
- [ ] Run and record current test/build results and a fresh end-to-end demo.
- [ ] Check GitHub access/collaborators, source attribution, AI/tools declaration and no committed secrets.

The team has instructed that no RunPod-specific deliverable document is to be added as part of this reorganization. See [submission guide](docs/SDC_SUBMISSION_GUIDE.md) for the mapping to the organizer's sample format.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

---

### 中文说明

**Skillogy** 是 SDC Hackathon 2026 Domain 1 项目，提供个人职业探索（A）、企业人力与学习发展（B1）、TVET/大学职业支持（B2）三条路径，以合成演示数据展示职业推荐、技能差距与学习规划。请将正式参赛队名、SDG、团队成员、Replit 演示地址、Pitch Slides 与视频地址补齐；原有三份提交 PDF 已保留在 `submission/` 中，未修改。
