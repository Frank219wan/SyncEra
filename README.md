# Skillogy — Grow Your Potential, Shape Your Future

**Completed Hackathon Product · SDC Hackathon 2026**

**Skillogy** (developed as **FutureProof AI / SyncEra**) is an interactive, full-stack AI-era career and skills development platform. It brings **individual career guidance, enterprise HR/L&D planning, and TVET institution insights** into one experience.

Our Hackathon product is **implemented, integrated in the public GitHub `main` branch, and demonstrated on Vercel with a connected FastAPI backend**. The three main journeys have been exercised against real API endpoints using fictional data. **The team is completing the public Production deployment now, targeting launch before the Hackathon closes.** The protected full-stack Vercel Preview remains the verified demonstration environment until the public Production API passes its own acceptance checks.

**Website:** [syncera-frontend.vercel.app](https://syncera-frontend.vercel.app/)  
**GitHub repository:** [Frank219wan/SyncEra](https://github.com/Frank219wan/SyncEra)  
**Interactive full-stack demo:** Vercel Frontend Preview (judge-access link provided privately through the Hackathon submission)  
**Languages:** English · 简体中文 · Bahasa Melayu

---

## The problem we solve

Career decisions are becoming harder as skills, industries and AI-enabled tasks evolve. Individuals need understandable career directions and actionable learning paths; HR teams need to identify capability gaps; and education providers need to understand how their students' skills align with changing role requirements.

**Skillogy connects discovery → assessment → matching → gap analysis → learning and planning**, with transparent evidence and human oversight.

## Product experiences — completed for the Hackathon

### A · Individual — Discover and grow

- **Guided onboarding and profile review:** build a profile from career goals, interests, education, experience, preferences and confirmed skills; try a fictional sample profile.
- **Optional five-question psychology reflection:** review and edit answers, with clear consent and user control. Psychology text is **not silently converted into a hiring or personality score**.
- **Career Radar and Career Matches:** explore potential directions and compare server-calculated, ranked role matches under **Moderate** and **Fast** AI scenarios.
- **Career Atlas visual experience:** illustrated, responsive career cards using actual API role names, ranks, scores, strengths, skill gaps, explanations and evidence. The connected experience does not substitute demo roles for server results.
- **Career role details and AI task insights:** examine role requirements, task-change examples, evidence provenance and uncertainty.
- **Skill Mind Map and Learning Roadmap:** turn identified gaps into skill relationships and actionable learning recommendations.
- **Bamboo Growth journey:** visualize growth and track personal learning activity in the interactive prototype; some plan/progress interactions remain browser-local rather than cloud-synchronized.

**Real API journey:** `Profile → Normalize / Confirm → Trends → Recommendations → Role / Evidence → Skill Map → Roadmap`.

### B1 · Organization — HR & Learning Development

Designed for organizations planning skills development across departments.

- Department-first organizational intake and goal setting.
- Optional **fictional/anonymized** employee skill baselines.
- **Skill gap heatmaps** and capability coverage.
- **Internal mobility** planning and human-review recommendations.
- Training and development priorities under explicit budget/horizon assumptions.
- Deterministic backend analysis with revision-aware workspace persistence.

**Real API:** `POST /api/v1/organizations/hr/analyze`.

### B2 · Organization — TVET & Career Centre

Designed for colleges, TVET institutions and career support teams.

- Review fictional student profiles, skill levels and interests.
- Analyze individual career directions and missing competencies.
- Compare **Moderate / Fast** scenarios without inventing live job-demand evidence.
- Explore trends, skill gaps and **cohort-level insights**.
- Review workshop, tutoring and curriculum improvement suggestions.
- Revision-aware server analysis and PostgreSQL-backed workspace storage.

**Real API:** `POST /api/v1/organizations/career_centre/analyze`.

## How it works

```text
                        SKILLOGY
                    React + TypeScript + Vite
                 English / Chinese / Malay UI
                               |
            Individual --------+-------- Organization
                               |             |
                               |          B1 HR / B2 TVET
                               |
                    Same-origin /api/v1/*
                               |
                Vercel Frontend server proxy
                               |
                     FastAPI Backend
              (deterministic analysis engine)
                               |
                    PostgreSQL / Neon
              (isolated protected Preview store)
```

| Layer | Implementation |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, responsive Career Atlas UI |
| Backend | Python, FastAPI, validated request/response contracts |
| Recommendation engine | Deterministic role scoring, scenario-aware matching, skills and gap analysis |
| Organization engine | B1 HR/L&D and B2 TVET deterministic analysis, revision conflict handling |
| Persistence | Neon PostgreSQL in the isolated full-stack Preview |
| Deployment | Vercel Frontend and Backend projects, same-origin API proxy |
| Languages | English, Chinese and Malay |
| Quality | Automated frontend, backend, API contract, cross-stack and browser checks |

**Why the AI approach is responsible:** the system makes its assumptions visible, preserves evidence identifiers, and distinguishes synthetic demonstration data from verified external observations. Optional MiniMax integration is gated; the validated Hackathon flows use deterministic analysis rather than paid generative scoring. There are **no claims of real hiring probability, verified salaries or live job-demand statistics**.

## Interactive demo

The product is deployed using the existing Vercel Frontend and Backend projects.

- **Public website entry:** [https://syncera-frontend.vercel.app/](https://syncera-frontend.vercel.app/)
- **Validated full-stack Hackathon build:** protected Vercel Preview, with an access-enabled share link furnished privately to judges.
- **What judges can explore:** Individual Career Matches and learning pathway; HR dashboard, heatmap and mobility; TVET student analysis, trends and cohort insights.

The validated Preview demonstrates **actual FastAPI requests and Neon Preview persistence**, not merely static mock screens. The public Production domain is being brought into alignment with that protected release; until then, it should not be treated as proof that every API path is publicly available.

**For security, the Vercel share credential is intentionally not published in this repository.** Use the submission-provided demo URL. Fictional examples only; do not upload real CVs, employees' records or student data.

## Delivered integration and verification

- The **Individual**, **B1 HR/L&D** and **B2 TVET** implementations are merged into `main`.
- The polished **Career Matches Real API** interface is merged, preserving backend-calculated scores, strict profile/snapshot checks, scenario switching, evidence and error handling.
- Protected Frontend ↔ Backend Preview testing demonstrated all three core user journeys against the real API.
- Neon Preview checks confirmed storage and revisioned organization/profile workflows with synthetic records.
- The Career Matches UI fix passed **137 frontend tests**, a Real-mode TypeScript/Vite build and its GitHub contract/cross-stack CI checks. Additional backend and browser QA is maintained in this repository.
- Desktop/mobile layout, dark theme and three languages are part of the experience.

These are **Hackathon product and protected-environment verification results**, not certification for unrestricted use with real personal, employer or student data.

## Run locally

Requirements: Node.js 22+, Corepack/pnpm; Python 3.10+ for the backend.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The frontend defaults to **Demo Mode** (`VITE_API_MODE=demo`) so you can explore the complete interface locally with fictional examples.

For frontend tests and the build:

```bash
corepack pnpm test
corepack pnpm build
```

For the backend:

```bash
cd backend
python -m venv .venv
# Activate .venv in your shell.
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Backend health: `http://127.0.0.1:8000/api/v1/health`.

**Real API Mode** (`VITE_API_MODE=real`) requires a correctly configured same-origin proxy and Backend environment. It must never silently fall back to Demo results if the API is unavailable. For the supported protected Preview setup, see [Vercel Preview Proxy](docs/VERCEL_PREVIEW_PROXY.md), [Individual-first Test Plan](docs/TEST_PLAN_INDIVIDUAL_FIRST.md), and the [Organization cloud acceptance record](docs/organization/ORGANIZATION_B1_B2_CLOUD_ACCEPTANCE.md).

## Final Production launch — in progress before the Hackathon deadline

**The Hackathon product is complete as an integrated, testable MVP. Production release is the team's immediate next milestone, actively being completed before the competition closes — not a post-Hackathon task.** The launch work is to verify that the latest `main` frontend and matching backend are deployed to the official domain, that the three Real API journeys work in a fresh browser session, and that access protection, environment isolation, synthetic-data restrictions and rollback are correctly configured.

Production is counted as **LIVE** only after the official domain and all three API journeys pass those checks. Further expansion to real personal or institution data will still require production-grade identity, authorization, tenant isolation, data governance and approvals. Durable learning-progress synchronization and approved market datasets can continue as separate enhancements; they are not represented as complete cloud features.

## Project documents

- [Product / integration status](docs/INTEGRATION_STATUS.md)
- [Frontend ↔ Backend Preview architecture](docs/VERCEL_PREVIEW_PROXY.md)
- [Individual user journey test plan](docs/TEST_PLAN_INDIVIDUAL_FIRST.md)
- [Organization B1/B2 cloud acceptance](docs/organization/ORGANIZATION_B1_B2_CLOUD_ACCEPTANCE.md)
- [Backend setup](backend/README.md)

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

---

### 中文简介

**Skillogy 是已完成整合的 SDC Hackathon 2026 全栈产品原型。** 我们在同一个平台提供三条核心体验：**Individual 个人职业探索与学习路线、Organization B1 企业 HR/L&D 技能规划、Organization B2 TVET 学生与群体职业分析**。系统使用 React + TypeScript + FastAPI，支持中英马三语；受保护的 Vercel Preview 已完成三个模块的真实 API 演示，并通过 Neon Preview 验证数据持久化。职业推荐使用可解释的确定性评分和合成测试数据，展示匹配分数、技能优势、技能差距、学习建议以及不确定性。

**Hackathon 产品已完成并整合至 `main`。团队正在立即推进 Production 正式域名上线，目标是在本次比赛结束前完成部署与 Individual、B1 HR、B2 TVET 三条真实 API 的公开环境验收，而不是等到赛后。正式上线状态以实际部署和验收结果为准；真实个人资料与机构数据的开放仍需独立完成身份、权限和隐私审核。**
