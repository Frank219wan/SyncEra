# FutureProof AI Phase-1 Source and Method Note

## 1. Delivery status

This folder contains a technically validated candidate snapshot and learning resource for the A (Individual) P0 flow. They use API Contract v1.0 IDs and Backend Phase 2 schemas.

The files named `TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION` are **not governance approval**. They allow reproducible schema and integration testing. Editing their `reviewed_by` or `reviewed_at` strings cannot authenticate a reviewer. The current candidate snapshot and resource IDs are blocked from normal import even after such an edit. Before activation, the Team Lead must inspect the original sources, figures, mapping and limitations, then authorize new immutable IDs and manifests through a separately controlled release process. Protect the approval files, approved-data directory and deployment configuration from the candidate author; maintain a human review record. The backend checks manifest consistency but cannot authenticate the human reviewer on its own.

## 2. Market sources

### DOSM Job Market Insights Q2 2026

- Owner: Department of Statistics Malaysia (DOSM)
- Release page: <https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026>
- Source PDF: <https://www.dosm.gov.my/uploads/release-content/file_20260818075305.pdf>
- Release date: 2026-08-18
- Extracted observation: Business Data Analyst (MASCO 2524-16) has 3,053 online job offerings in Q2 2026. The highest count among the five displayed STEM popular jobs is Technician with 6,565.

Role score calculation:

```text
role_data_analyst trend_score
= 100 × Business Data Analyst Q2 offerings / maximum Q2 count in shown STEM table
= 100 × 3,053 / 6,565
= 46.50
```

This is a reproducible normalization within the published table. It is not a percentage of all Malaysian jobs and not a claim about total vacancies.

### TalentCorp MyCOL 2024/2025

- Owner: Talent Corporation Malaysia Berhad
- Landing page: <https://www.talentcorp.com.my/mycol/>
- Report PDF: <https://www.talentcorp.com.my/images/uploads/publication/204/MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf>
- Relevant occupation: Data Professionals (MASCO 2524), including Data Analyst and Business Data Analyst
- Relevant skill family: data, analytics and database skills

Skill score calculation:

```text
skill_sql trend_score = 70
```

`70` is a controlled taxonomy score: SQL is a direct canonical member of the official broader database-skill family. It must not be presented as SQL mention rate or growth. `mention_rate`, `change_pp` and `coverage` remain null. Coverage has no supported numerator, denominator or external validation; the UI must not render null as 100%.

## 3. Moderate and Fast

```text
Moderate projected outlook = observed role score × 1.00
Fast projected outlook     = observed role score × 1.05
```

For this snapshot:

```text
Moderate = 46.50
Fast     = 48.83  # round(46.50 × 1.05, 2)
```

These multipliers are explicit Phase-1 scenario assumptions, not market observations. The stored `valid_postings=3053` never changes between scenarios.

## 4. Learning resource

- Provider: Microsoft Learn
- Learning path: [Get Started with Python Programming: Part 1 - Fundamentals](https://learn.microsoft.com/en-us/training/paths/get-started-with-python-fundamentals/)
- Mapping: `skill_python`
- Language: English (`en`)
- Cost: MYR 0
- Estimated duration: 3.2 hours (four modules; approximately 3 hours 12 minutes shown by Microsoft Learn at verification time)
- Limitation: course content, duration, availability and terms can change; re-verify during each resource refresh.

## 5. Refresh rule

Create a new immutable `snapshot_id` for every refresh. Never rewrite this snapshot. Re-run source retrieval, mapping, scoring, independent approval and Backend import. Historical movement (`delta_percent`, `change_pp`) must remain null until comparable snapshots pass the same method and quality controls.
