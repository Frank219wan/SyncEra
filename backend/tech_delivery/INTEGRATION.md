# Backend Integration — Minimum Callable Delivery

## 1. Python entry points

| Capability | Import | Signature | Return |
|---|---|---|---|
| Profile extraction | `futureproof_ai.extract_profile` | `extract_profile(text, questionnaire)` | Backend extraction `dict` |
| Trend retrieval | `futureproof_ai.retrieve_trends` | `retrieve_trends(profile_or_cohort, snapshot_id, top_k=20, *, market_repository)` | `app.models.TrendPackage` |
| Role scoring | `futureproof_ai.score_roles` | `score_roles(profile, trend_package, scenario)` | `list[Recommendation dict]` |
| Connected adapter factory | `futureproof_ai.futureproof_adapter.create_adapter` | `create_adapter()` | Adapter object |

No package beyond Backend requirements is added. The implementation uses Python standard library plus existing `app` Pydantic models and catalogue IDs.

## 2. Enable the adapter

PowerShell:

```powershell
$env:AI_ADAPTER_MODULE = "futureproof_ai.futureproof_adapter"
```

The adapter is deterministic and input-dependent, so `adapter.is_mock` is `false`. It is not an LLM. HTTP normalization/upload metadata is `synthetic_demo` / `is_mock=true` because the supplied CV/profile is synthetic. Recommendation metadata is `mixed_demo` / `is_mock=true` for the candidate source, because the role catalogue and explanations are partly synthetic and formal source approval is pending.

## 3. Stage candidate data for technical testing

Do not import precheck manifests into `data/approved`. The normal import CLI and startup loader reject them. For a local technical HTTP run, use the isolated loopback evidence script; it loads prechecks into temporary in-memory repositories and a temporary SQLite database:

```bash
cd backend
.venv/bin/python scripts/generate_phase4_http_evidence.py
```

After Team Lead review, create new reviewer-owned manifests, import via `python -m app.import_data`, then set:

```powershell
APPROVED_DATA_DIR=data/approved
ACTIVE_SNAPSHOT_ID=snap_my_dosm_mycol_2026q2_v1
AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter
```

## 4. Reproducible matching formula

```text
Match Score = 0.45 × Skill Compatibility
            + 0.20 × Interests / Preferences
            + 0.20 × Scenario Outlook
            + 0.15 × Transition Feasibility
```

- Skill Compatibility: target-level coverage weighted `high=3`, `medium=2`, `low=1`; unknown level contributes zero.
- Interests / Preferences: 60% explicit preferred-field match + 40% explicit interest overlap.
- Scenario Outlook: bounded `observed role score × scenario multiplier`.
- Transition Feasibility: 50% inverse weighted level gap + 35% available study-time fit + 15% field adjacency.
- Level-to-time estimate: 20 study hours per missing proficiency level.
- Skill Gap: every required role skill with missing/unknown level or current level below target.

Backend independently validates the weighted arithmetic and exact Evidence IDs.

## 5. Current P0 boundary

This delivery closes the minimum A-flow AI/data gap for:

1. synthetic guided text/form extraction;
2. user confirmation;
3. reviewed Snapshot retrieval;
4. Moderate/Fast deterministic recommendations;
5. Evidence-backed score display;
6. one real resource attached to a Python Skill Mind Map.

B1 HR, B2 Career Centre, progress tracking and trend refresh remain P1 and are intentionally not implemented here.
