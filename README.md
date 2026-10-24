# Skillogy

> An AI-era career guidance and skills-development prototype for individuals, HR/L&D teams, and TVET or university career centres.

Built by **SyncEra** for **SDC Hackathon 2026, Domain 1**. The public product name is Skillogy; the registered team name is SyncEra.

## Team Information

| Field | Details |
| --- | --- |
| Team Name | SyncEra |
| Team Domain | Domain 1 — The Aiversecity Future-Ready Workforce |
| SDG Track (1–17) | Proposed primary: SDG 4 — Quality Education; supporting: SDG 8 — Decent Work and Economic Growth |
| Team Leader | Manar HAMMADOUCHE |
| University | Xiamen University Malaysia |
| Number of Members | 5 |

## Links

| Resource | Link |
| --- | --- |
| GitHub Repository | [Frank219wan/SyncEra](https://github.com/Frank219wan/SyncEra) |
| Live Demo | [Skillogy on Vercel](https://syncera-frontend.vercel.app/) — public Production access and each Real API path need separate verification |
| RunPod Endpoint | Not applicable — RunPod was not used |
| Slide Deck | [Skillogy presentation](submission/SyncEra_Skillogy_slides.pptx) |
| Demo Video | [Watch on YouTube](https://youtu.be/QHj16ZdgBDI) · [Download MP4](submission/SyncEra-Demo-video.mp4) |
| Preliminary Submission | [Proposal PDF](submission/SDC2026_SyncEra_Preliminary.pdf) |
| Technical & Tools Declaration | [Declaration PDF](submission/SDC2026_SyncEra_TechDeclaration.pdf) |
| Replit Proof of Use | [Proof PDF](submission/SDC2026_SyncEra_Replit_POU.pdf) |

The live demo above is hosted on Vercel, **not** Replit. The repository contains Replit usage evidence, but a currently working public Replit deployment URL has not been verified. Confirm that this and the RunPod non-use declaration meet the organizer's requirements before submission.

## Overview

### Problem

AI adoption and shifting skill requirements make career decisions harder for learners and working professionals. HR/L&D teams need a clearer view of workforce capability gaps, while education providers need to connect student skills to realistic next steps. Generic career advice often does not show why a role is recommended or what to learn next.

### Solution

Skillogy turns user-reviewed skills and interests into explainable role matches, skill gaps and learning paths. It provides Individual (A), HR/L&D (B1) and TVET/Career Centre (B2) journeys. Moderate and Fast represent project scenarios, not verified forecasts. Recommendation scores use deterministic rules; an optional, gated MiniMax integration can assist with synthetic text extraction, but does not generate suitability scores.

The prototype is decision support. It must not be used as an automated hiring, redundancy, certification or job-demand prediction system. Use fictional sample inputs only; do not upload real CVs, employee records or student data.

### Key Features

- **Individual:** Profile review, Career Radar, role matches, skill gaps, Skill Mind Maps, learning roadmaps and progress tracking.
- **HR/L&D:** Department capability analysis, skill heatmaps, reviewable internal mobility suggestions and training priorities.
- **TVET/Career Centre:** Student and cohort analysis, career guidance, workshop recommendations and curriculum suggestions.
- **Across all journeys:** Rule-validated outputs, labelled uncertainty, Demo/Real mode separation, responsive layout and English, 简体中文 and Bahasa Melayu interfaces.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Backend | Python, FastAPI, Pydantic and `/api/v1` JSON contracts |
| Database | Local SQLite; isolated Neon/PostgreSQL for selected protected Preview workflows |
| AI / Compute | Deterministic scoring and skill-gap rules; optional server-side Tencent TokenHub/MiniMax extraction for approved synthetic tests; no RunPod workload |
| Hosting / Dev | Replit configuration and usage evidence; Vercel frontend/backend projects with a same-origin API proxy; GitHub Actions CI |

## Project Structure

```text
SyncEra/
├── src/                  # React/TypeScript frontend
├── backend/
│   ├── app/              # FastAPI routes, models, services and storage
│   ├── futureproof_ai/   # AI adapter import-compatible package
│   ├── tests/            # Backend tests
│   └── requirements.txt  # Backend runtime dependencies
├── api/                  # Frontend-side server proxy
├── tests/                # Frontend and cross-stack tests
├── docs/                 # Architecture, QA and integration records
├── submission/           # Proposal, declaration, Replit proof, slides and demo video
├── scripts/              # Replit development/build/start scripts
├── .replit               # Replit launcher
├── .env.example          # Non-secret configuration examples
├── package.json          # Frontend scripts and dependencies
├── pnpm-lock.yaml        # Locked frontend dependencies
├── LICENSE               # Apache License 2.0
└── README.md
```

### Architecture

```text
Browser: Individual A / Organization B1 / Career Centre B2
                         │
                    /api/v1/*
                         │
       Same-origin proxy or local API route
                         │
                    FastAPI backend
            ┌────────────┼────────────┐
       Profile data   Rule-based     Learning and
       and storage    role matching  skill-gap plans
```

The default demo uses synthetic fixtures. Public market data candidates and protected Preview acceptance records have separate approval and access boundaries; a working homepage does not prove every Real API journey. See [backend setup](backend/README.md) and the [submission guide](docs/SDC_SUBMISSION_GUIDE.md).

## How to Run

### Option 1 — Run on Replit

1. Import [this repository](https://github.com/Frank219wan/SyncEra) into Replit. No verified public Replit project or deployment URL is currently documented here.
2. Provide only the environment settings appropriate to the intended synthetic test; see [`.env.example`](.env.example). Keep API keys in server-side Secrets, never in the repository or browser build.
3. Click **Run**. The committed [`.replit`](.replit) invokes `scripts/run-replit.sh`; deployment build/start scripts are also provided. This is a configuration path, not a claim of current Replit deployment success.

### Option 2 — Run Locally

Requirements: Node.js 22+, Corepack/pnpm and Python 3.10+.

```bash
git clone https://github.com/Frank219wan/SyncEra.git
cd SyncEra
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The frontend starts in synthetic Demo mode. To start the backend separately:

```bash
cd backend
python -m venv .venv
# Activate .venv first: Windows .venv\Scripts\activate; macOS/Linux source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Backend health: `http://127.0.0.1:8000/api/v1/health`. Real API mode (`VITE_API_MODE=real`) requires a correctly configured same-origin proxy and backend; running the two development servers alone does not verify the hosted integration.

### Run Tests

```bash
# Repository root
corepack pnpm test
corepack pnpm build

# Backend
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest tests -q
```

These are the available commands, not a claim that this documentation change has freshly passed the full test suite.

## How We Use Replit (Required)

The team used Replit during development and recorded screenshots of the project and a publishing attempt in the [proof-of-use PDF](submission/SDC2026_SyncEra_Replit_POU.pdf). The root [`.replit`](.replit) and [scripts](scripts/) provide startup and deployment commands. The current public demo uses Vercel; the screenshots do **not** establish a successful, currently accessible Replit deployment. No Replit Secret or access token is published here.

## How We Use RunPod (Required)

**Not applicable to this implementation:** the team did not use RunPod, does not operate a RunPod endpoint and has no RunPod proof-of-use file. Scoring and skill-gap calculations are CPU-side deterministic rules; the optional hosted MiniMax adapter is separate from RunPod. Because the organizer's [README template](https://github.com/michaelzhngg/SDC_Hackathon_Submission_Template/blob/main/README.md) labels this section "Required," the team should confirm whether a truthful non-use declaration is acceptable rather than claim an unperformed GPU workload.

## Challenges & Learnings

- **Evidence provenance:** Keep role-fit scores separate from labour-market signals and label the date, coverage and approval state of each source.
- **Frontend/backend consistency:** Align API contracts, scenario identifiers and role IDs; hide stale results and show Real API errors rather than Demo recommendations.
- **Privacy and deployment:** Use fictional records for demonstrations and distinguish protected Preview evidence from public Production verification.

## Future Improvements

- Verify applicable Real API flows, access controls and persistence in Production before broader public use.
- Activate only reviewed public market evidence and vetted learning resources, with source, date, geography and coverage metadata.
- Improve durable learning progress, institution review and operational monitoring after data-governance approval.

## Team

| Name | Role | GitHub |
| --- | --- | --- |
| Manar HAMMADOUCHE | Team Leader, Full Stack Development & Documentation | [Gizmo-coding](https://github.com/Gizmo-coding) |
| WAN SIYU | Backend Developer | [Frank219wan](https://github.com/Frank219wan) |
| YAN YUXIN | Frontend Developer | [Yasmin-001](https://github.com/Yasmin-001) |
| YUAN XIAOYU | Frontend Developer | [MAOMAO](https://github.com/yuanxiaoyu779) |
| XIANG JINGZHE | AI Developer | [XIANG JINGZHE](https://github.com/june250630) |

## Submission Checklist

- [x] Team name, domain and proposed SDG track are filled in.
- [x] Slide deck link is included.
- [x] YouTube demo video link is included.
- [x] Replit use is documented in `submission/`.
- [ ] Confirm whether the organizer accepts RunPod non-use; no RunPod proof exists.
- [x] Preliminary submission PDF is present with the SyncEra team name.
- [x] Technology declaration PDF is present with the SyncEra team name.
- [ ] Review the technology declaration's AI-model and Replit-use descriptions against actual implementation and usage.
- [x] Submission filenames use the team name.
- [ ] Verify the Replit run path, public demo and YouTube playback in a fresh session accessible to judges.
- [ ] Run and record current tests/builds and a complete end-to-end demonstration.
- [ ] Complete an independent check for committed secrets, third-party licenses and source attribution.

## License

This project is licensed under the [Apache License, Version 2.0](LICENSE).
