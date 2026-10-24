<div align="center">

# Skillogy

### AI Career Intelligence & Personalized Reskilling

An AI-era career guidance and skills-development platform for individuals, HR/L&D teams, and TVET/university career centres.

**Built by SyncEra · SDC Hackathon 2026 · Domain 1**

**[Explore the Live Demo](https://syncera-frontend.vercel.app/) · [Watch the Demo Video](https://youtu.be/QHj16ZdgBDI) · [Download the Slides](submission/SyncEra_Skillogy_slides.pptx)**

English · 简体中文 · Bahasa Melayu

</div>

---

## Contents

[Team Information](#team-information) · [Links & Submission Documents](#links--submission-documents) · [Overview](#overview) · [Tech Stack & Architecture](#tech-stack--architecture) · [Project Structure](#project-structure) · [How to Run](#how-to-run) · [Platform Usage](#platform-usage) · [Challenges & Learnings](#challenges--learnings) · [Future Improvements](#future-improvements) · [Team](#team) · [Submission Checklist](#submission-checklist) · [License](#license)

## Team Information

| Field | Details |
| --- | --- |
| **Team Name** | **SyncEra** |
| **Team Domain** | **Domain 1 — The Aiversecity Future-Ready Workforce** |
| **Proposed Primary SDG** | **SDG 4 — Quality Education** |
| **Supporting SDG** | **SDG 8 — Decent Work and Economic Growth** |
| **Team Leader** | Manar HAMMADOUCHE |
| **University** | Xiamen University Malaysia |
| **Number of Members** | 5 |

## Links & Submission Documents

### Explore the Product

| Resource | Link |
| --- | --- |
| **Live Demo** | [Open Skillogy](https://syncera-frontend.vercel.app/) |
| **Demo Video** | [Watch on YouTube](https://youtu.be/QHj16ZdgBDI) · [Download MP4](submission/SyncEra-Demo-video.mp4) |
| **Slide Deck** | [Download PowerPoint](submission/SyncEra_Skillogy_slides.pptx) |
| **Source Code** | [Frank219wan/SyncEra](https://github.com/Frank219wan/SyncEra) |

### Submission Documents

| Document | File |
| --- | --- |
| Preliminary Submission | [View PDF](submission/SDC2026_SyncEra_Preliminary.pdf) |
| Technology Declaration | [View PDF](submission/SDC2026_SyncEra_TechDeclaration.pdf) |
| Replit Proof of Use | [View PDF](submission/SDC2026_SyncEra_Replit_POU.pdf) |

> **Platform status:** The live demo is hosted on Vercel. Replit proof of use is submitted above. RunPod was not used.

<details>
<summary><strong>Demo scope and integration evidence</strong></summary>

Individual (A), HR/L&D (B1), and TVET/Career Centre (B2) paths are implemented in the shared application and have protected Preview integration records. Preview access is shared privately with authorized judges. Public Production functionality must be assessed independently; a working homepage does not confirm every Real API path is accessible.

Use fictional sample inputs. The prototype is designed for synthetic demonstrations; do not submit real CVs, employee data or student records.

</details>

---

## Overview

### Problem

AI adoption and shifting skill requirements create uncertainty for learners and working professionals. Organizations need to identify workforce capability gaps, while education providers need clearer feedback on student skills and career readiness. Existing generic advice can be difficult to turn into an achievable, evidence-aware learning plan.

### Solution

**Skillogy** organizes declared skills and interests into a user-confirmed profile, combines it with structured career/skills signals, and presents **explainable role matches, skill gaps and learning paths**. Users explore **Moderate** and **Fast** AI-change scenarios without treating those assumptions as facts. Its organization routes use the shared analysis foundation for skills planning and cohort advice, not automated hiring or redundancy decisions.

### Key Features

| Experience | Who It Serves | Key Capabilities |
| --- | --- | --- |
| **A · Individual** | Learners and working professionals | Profile review, Career Radar, Career Atlas matches, role/task details, Skill Mind Maps, roadmaps and bamboo-inspired progress |
| **B1 · HR / L&D** | Organizations and workforce planners | Department capability insights, skills gaps, internal mobility and training priorities |
| **B2 · TVET / Career Centre** | Institutions and career support teams | Student and cohort exploration, skill gaps, workshop and curriculum suggestions |

**Across all journeys:** Rule-validated scores, visible uncertainty, clearly labelled synthetic data, responsive layouts and three interface languages.

The present prototype is **decision support**, not a prediction of hiring probability, an official job-demand forecast, or a professional certification system.

---

## Tech Stack & Architecture

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

<details>
<summary><strong>View the repository layout</strong></summary>

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
│   ├── SyncEra_Skillogy_slides.pptx # Presentation deck
│   ├── SyncEra-Demo-video.mp4       # Demo video (Git LFS)
│   └── README.md                   # Submission document index
├── scripts/                        # Replit build/development/production scripts
├── .replit                         # Replit launcher
├── .env.example                    # Safe non-secret examples
├── package.json / pnpm-lock.yaml   # Frontend tooling
├── vercel.json                     # Vercel deployment config
├── LICENSE                         # Apache-2.0
└── README.md
```

</details>

---

## How to Run

### Option 1 · Replit

Import [this repository](https://github.com/Frank219wan/SyncEra) into Replit. The committed [`.replit`](.replit) runs `scripts/run-replit.sh` and has corresponding deployment build/start scripts. It requires a Replit environment with Node.js, pnpm/Corepack and Python. Use **fictional sample inputs only**.

The team has submitted a [Replit proof-of-use PDF](submission/SDC2026_SyncEra_Replit_POU.pdf). The live demo is hosted on [Vercel](https://syncera-frontend.vercel.app/).

### Option 2 · Run Locally

Requirements: **Node.js 22+**, Corepack/pnpm, **Python 3.10+** (for backend).

```bash
git clone https://github.com/Frank219wan/SyncEra.git
cd SyncEra
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The frontend starts in **synthetic Demo mode** by default. Its pages may be explored without an LLM key or live backend.

#### Start the Backend

Run FastAPI in a separate terminal:

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

## Platform Usage

### Replit

The project includes a root [`.replit`](.replit) configuration and scripts for development, building and deployment. Our submitted [Replit Proof of Use](submission/SDC2026_SyncEra_Replit_POU.pdf) documents the team's use of Replit. The live demo linked above is hosted on Vercel.

### RunPod

**RunPod was not used in this project.** There is no RunPod endpoint or RunPod proof-of-use document. The application uses a FastAPI backend with deterministic scoring and rules, plus optional gated MiniMax integration as described in the tech stack.

---

## Challenges & Learnings

| Challenge | Learning |
| --- | --- |
| **Evidence provenance** | Keep role-fit scores distinct from labour-market signals, and label dataset approval and coverage clearly. |
| **Frontend/backend consistency** | Align contracts, scenario snapshots and role identifiers; handle stale responses and API failures explicitly. |
| **Privacy and deployment** | Use fictional data for demonstrations and assess public Production separately from protected Preview verification. |

## Future Improvements

- [ ] Complete and independently verify Production deployment of applicable Real API flows and their access controls.
- [ ] Activate only reviewed/approved public market evidence and vetted resources, with date, geography and coverage metadata.
- [ ] Improve durable progress tracking, team/education review and operational monitoring where supported by permissions and real data governance.

---

## Team

| Name | Role | GitHub |
| --- | --- | --- |
| Manar HAMMADOUCHE | Team Leader, Full Stack Development & Documentation | [Gizmo-coding](https://github.com/Gizmo-coding) |
| WAN SIYU | Backend Developer | [Frank219wan](https://github.com/Frank219wan) |
| YAN YUXIN | Frontend Developer | [Yasmin-001](https://github.com/Yasmin-001) |
| YUAN XIAOYU | Frontend Developer | [MAOMAO](https://github.com/yuanxiaoyu779) |
| XIANG JINGZHE | AI Developer | [XIANG JINGZHE](https://github.com/june250630) |

---

## Submission Checklist

- [x] Team name, domain, proposed primary/supporting SDGs, leader, university and five-member roster provided.
- [x] Slide deck linked from `submission/`.
- [x] YouTube demo video link added.
- [ ] Verify video playback, duration and judge access.
- [x] Preliminary PDF exists: [SDC2026_SyncEra_Preliminary.pdf](submission/SDC2026_SyncEra_Preliminary.pdf).
- [x] Technical declaration PDF exists: [SDC2026_SyncEra_TechDeclaration.pdf](submission/SDC2026_SyncEra_TechDeclaration.pdf).
- [x] Replit Proof of Use PDF exists: [SDC2026_SyncEra_Replit_POU.pdf](submission/SDC2026_SyncEra_Replit_POU.pdf).
- [ ] Confirm the content, registered team identity and organizer-required naming of those PDFs (no PDF modifications were made).
- [x] Live demo URL provided; Replit proof-of-use linked.
- [ ] Verify the live demo in a fresh browser session.
- [ ] Run and record current test/build results and a fresh end-to-end demo.
- [ ] Check GitHub access/collaborators, source attribution, AI/tools declaration and no committed secrets.

RunPod was not used; its endpoint and proof-of-use items are explicitly recorded as not used. See the [organizer template](https://github.com/michaelzhngg/SDC_Hackathon_Submission_Template/blob/main/README.md) for the required submission format.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

---

## 中文简介

**Skillogy** 是 SDC Hackathon 2026 Domain 1 项目，提供个人职业探索（A）、企业人力与学习发展（B1）、TVET/大学职业支持（B2）三条路径，以合成演示数据展示职业推荐、技能差距与学习规划。参赛团队为 SyncEra，来自厦门大学马来西亚分校，共五名成员。拟定主要目标为 SDG 4，支持 SDG 8。上方提供 Vercel 在线演示、YouTube 视频、演示文稿及三份提交 PDF 的链接；Replit 使用证明已提交，本项目未使用 RunPod。
