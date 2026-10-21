# FutureProof AI — Tech Phase-1 最小可调用交付报告 v0.1.0

> 日期：2026-10-21
> 负责人：Tech
> 当前优先级：先跑通 A（Individual）真实闭环；B1 HR、B2 Career Centre 与 P1 暂不扩展。

## 1. 交付结论

已基于 Backend Phase 2 ZIP 的实际代码和 API Contract v1.0 ID，完成第一版可直接装载的 Tech 模块与真实来源候选数据：

1. `extract_profile`：保守型画像提取，不虚构技能等级；
2. `retrieve_trends`：从 Backend 已审核仓库读取指定 Snapshot，不绕过审批边界；
3. `score_roles`：确定性、可复算的 Matching Score、Skill Gap、Moderate/Fast 场景；
4. Backend Adapter：可通过 `AI_ADAPTER_MODULE` 直接装载；
5. 一个 DOSM + TalentCorp 处理后的 Malaysia TrendSnapshot；
6. 一个 Microsoft Learn Python 学习资源，可挂到 Skill Mind Map；
7. 四项新增 Tech 联调测试，覆盖数据导入、函数复现、A 流程和资源挂载。

本版本是**真实输入驱动的确定性算法基线**，不是 LLM。它适合先把真实端到端演示跑通，并提供稳定的回归基线；后续 LLM 只能替换画像解析或解释层，不能改变 ID、证据、评分与审批约束。

## 2. 本次读取到的 Backend 真实状态

Backend ZIP：

```text
C:\Users\Xiang\Documents\xwechat_files\wxid_zj1ap69j984422_0937\msg\file\2026-10\backend(1).zip
```

工作副本：

```text
D:\codex\2026SDGhackthon\backend_received_20261021\backend
```

已确认 Backend 当前具备：

- FastAPI P0 API；
- SQLite 画像确认与 revision 控制；
- Snapshot / Evidence / Resource 导入校验；
- 服务端推荐编排；
- `AI_ADAPTER_MODULE` 装载边界；
- Recommendation 算术、Catalogue ID、Evidence ID 二次校验；
- PDF/DOCX synthetic CV 上传入口；
- P1 接口显式返回 503，不伪装已实现。

GitHub 仓库 <https://github.com/Frank219wan/SyncEra> 当前检查结果仍只有初始提交和 `LICENSE`，因此此次以 Backend ZIP 作为唯一联调基线，未向远端仓库推送。

## 3. 代码交付

### 3.1 Backend 可直接装载的 Adapter

模块路径：

```text
futureproof_ai.futureproof_adapter
```

启动变量：

```powershell
$env:AI_ADAPTER_MODULE = "futureproof_ai.futureproof_adapter"
```

工厂与接口：

```python
create_adapter() -> FutureProofAdapter

adapter.is_mock: bool = False

adapter.extract_profile(
    text: str | None,
    questionnaire: dict | None,
) -> dict

adapter.score_roles(
    profile: app.models.Profile,
    trend_package: app.models.TrendPackage,
    scenario: str,
) -> list[dict]
```

概念型、当前 HTTP 路由未直接调用的入口：

```python
retrieve_trends(
    profile_or_cohort,
    snapshot_id: str | None,
    top_k: int = 20,
    *,
    market_repository,
) -> app.models.TrendPackage
```

它只读取 Backend 已导入并审核的 Snapshot，不在请求时抓取互联网。

### 3.2 依赖

未新增第三方依赖。使用：

- Python 标准库；
- Backend 现有 `pydantic` 模型；
- Backend 现有 `app.catalogue` ID；
- Backend 现有 `MarketRepository` 与 `TrendPackage`。

## 4. Profile Extraction Schema 与规则

返回结构：

```json
{
  "skills": [
    {
      "skill_id": "skill_sql",
      "level": 3,
      "source": "declared",
      "confidence": 1.0
    }
  ],
  "interests": ["analytics"],
  "current_occupation": "Operations Assistant",
  "unrecognized_skill_terms": [],
  "warnings": ["..."]
}
```

规则：

- 表单显式提交且 `skill_id` 合法：`source=declared`、`confidence=1.0`；
- 文本命中 Catalogue 名称或 alias：`source=inferred`、`confidence=0.85`；
- 文本命中时 `level=null`，绝不从一句描述推断等级；
- 非法 ID 进入 `unrecognized_skill_terms`；
- 用户仍必须经过 `/api/v1/profiles/confirm` 才能推荐。

## 5. 市场趋势 Snapshot

### 5.1 Snapshot 标识

```text
snapshot_id = snap_my_dosm_mycol_2026q2_v1
region      = MY
window      = 2026-04-01 至 2026-06-30
method      = fp-trend-dosm-mycol-v0.1.0
data_label  = public_open
```

### 5.2 Evidence

| Evidence ID | 来源 | 用途 |
|---|---|---|
| `ev_dosm_jmi_2026q2_business_data_analyst` | DOSM Job Market Insights Q2 2026 | Business Data Analyst Q2 在线职位数量与可复算 role score |
| `ev_talentcorp_mycol_2024_2025_data_professionals` | TalentCorp MyCOL 2024/2025 | Data Professionals 关键职业判断与数据库技能族映射 |

DOSM 发布的 Q2 2026 表中，Business Data Analyst 为 3,053 个 online job offerings；同一张 STEM popular jobs 表内最高值为 Technician 的 6,565。因此：

```text
role_data_analyst trend_score
= 100 × 3,053 / 6,565
= 46.50
```

这只是**同一官方表内的归一化信号**，不是全市场份额，也不是 Malaysia 所有 vacancy 的统计。

TalentCorp MyCOL 将 Data Professionals 列为关键职业，并把 data、analytics、database skills 列为重要技能族。本版本将 Catalogue 的 `skill_sql` 映射到这个上位技能族：

```text
skill_sql trend_score = 70.00
```

`70` 是受控 taxonomy score，不是 SQL mention rate 或增长率；对应的 `mention_rate`、`change_pp` 均保持 `null`。

## 6. Moderate / Fast 与 Matching Score

### 6.1 场景规则

```text
Moderate outlook = observed role score × 1.00
Fast outlook     = observed role score × 1.05
```

因此：

```text
Moderate = 46.50
Fast     = 48.83
```

场景只改变 `scenario_outlook`，不修改 `valid_postings=3053`、Evidence 或任何已观测字段。

### 6.2 总分公式

```text
Match Score = 0.45 × Skill Compatibility
            + 0.20 × Interests / Preferences
            + 0.20 × Scenario Outlook
            + 0.15 × Transition Feasibility
```

Backend 会再次计算该公式，误差超过 `0.01` 会以 `MODEL_INVALID_OUTPUT` 拒绝。

### 6.3 分量定义

#### Skill Compatibility

```text
importance weight: high=3, medium=2, low=1

coverage_i = min(current_level / target_level, 1)
unknown current level = 0

Skill Compatibility
= 100 × Σ(weight_i × coverage_i) / Σ(weight_i)
```

#### Interests / Preferences

```text
60% × preferred field match
+ 40% × explicit interest overlap
```

未提供 preferred field 时使用中性值 50；不会从 MBTI 推断职业能力。

#### Transition Feasibility

```text
gap_burden = weighted missing levels / weighted target levels
estimated_hours = 20 × total missing proficiency levels
capacity_hours = weekly_hours × target_weeks
time_fit = min(1, capacity_hours / estimated_hours)

Transition Feasibility
= 100 × [
    0.50 × (1 - gap_burden)
  + 0.35 × time_fit
  + 0.15 × field_adjacency
]
```

每缺少一级按 20 小时估算，是透明的 Phase-1 heuristic，不是经过就业结果校准的事实。

### 6.4 固定输入复算示例

输入：

```text
confirmed skill: SQL level 3
interests: analytics, data
preferred field: field_data
weekly hours: 5
target weeks: 12
```

结果：

| 分量 | Moderate | Fast |
|---|---:|---:|
| Skill Compatibility | 37.50 | 37.50 |
| Interests / Preferences | 100.00 | 100.00 |
| Scenario Outlook | 46.50 | 48.83 |
| Transition Feasibility | 56.45 | 56.45 |
| **Match Score** | **54.64** | **55.11** |

Skill Gap：

| Skill ID | 当前等级 | 目标等级 | 重要度 |
|---|---:|---:|---|
| `skill_python` | null | 3 | high |
| `skill_validation` | null | 2 | medium |

## 7. Skill Mind Map 真实资源

```text
resource_id    = resource_mslearn_python_fundamentals_p1
skill_id       = skill_python
provider       = Microsoft Learn
language       = en
cost           = MYR 0
estimated time = 3.2 hours
```

课程：<https://learn.microsoft.com/en-us/training/paths/get-started-with-python-fundamentals/>

资源会在以下条件满足时附加到 Skill Mind Map：

- 请求 `skill_id=skill_python`；
- 该技能确实是当前 Profile 的 gap；
- `language=en`；
- `currency=MYR`；
- `budget_amount>=0`。

课程内容、时长、URL 和条款可能变化，因此后续 refresh 必须重新核验。

## 8. 文件清单

### AI 模块

```text
futureproof_ai/__init__.py
futureproof_ai/futureproof_adapter.py
futureproof_ai/extraction.py
futureproof_ai/trends.py
futureproof_ai/scoring.py
```

### 数据与方法

```text
tech_delivery/snapshot_dosm_mycol_my_2026q2_v1.json
tech_delivery/source_approvals_TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION.json
tech_delivery/resources_python_p1.json
tech_delivery/resource_approvals_TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION.json
tech_delivery/SOURCE_METHOD.md
tech_delivery/INTEGRATION.md
```

### 测试

```text
tests/test_futureproof_ai_delivery.py
```

## 9. Backend 接入步骤

### 9.1 Team Lead 完成人工批准

当前两个 `TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION` 文件仅用于 Schema 与集成验证，**不是治理批准**。

Team Lead 需要：

1. 独立打开每个精确 URL；
2. 检查来源、数值、角色/技能映射与 limitations；
3. 把 `reviewed_by` 替换为真实审核人；
4. 把 `reviewed_at` 更新为审核后的 timezone-aware 时间；
5. 再执行 Backend import。

### 9.2 导入数据

```powershell
python -m app.import_data snapshot `
  --package tech_delivery/snapshot_dosm_mycol_my_2026q2_v1.json `
  --approvals <team-lead-source-approvals.json> `
  --output-dir data/approved

python -m app.import_data resources `
  --package tech_delivery/resources_python_p1.json `
  --approvals <team-lead-resource-approvals.json> `
  --output-dir data/approved
```

### 9.3 启动配置

```powershell
$env:APPROVED_DATA_DIR = "data/approved"
$env:ACTIVE_SNAPSHOT_ID = "snap_my_dosm_mycol_2026q2_v1"
$env:AI_ADAPTER_MODULE = "futureproof_ai.futureproof_adapter"
```

## 10. 验证结果

### 新增 Tech 测试

```text
4 passed
```

覆盖：

- 不虚构 proficiency；
- Snapshot 和 Resource 通过 Backend 导入校验；
- 同输入结果完全一致；
- Moderate/Fast 只改变 scenario outlook；
- Evidence ID 精确传递；
- A 画像确认 → 推荐 → Skill Gap → Skill Mind Map 资源闭环。

### Backend 可运行回归

```text
36 passed, 0 failed
```

最新 GitHub Backend 分支已经在 `backend/contracts/` 补齐 API Contract v1.0。为保证 Windows 与 Linux 均可读取其中的 UTF-8 字符，测试改为显式 `encoding='utf-8'`；包括原始 OpenAPI shape test、Adapter 契约和 request-level field 覆盖在内的完整套件现已全部通过。

## 11. 当前边界与风险

1. **治理审批待完成**：Tech 已完成技术预检，但不能代替 Team Lead source approval。
2. **覆盖面最小**：Snapshot 只覆盖 `role_data_analyst` 与 `skill_sql`，满足最小 A 演示，不代表完整 Malaysia 市场。
3. **角色 Catalogue 仍有 synthetic 内容**：Backend 因此按设计把 recommendation 标为 `mixed_demo / is_mock=true`，即使 Adapter 和 Snapshot 不是 mock。
4. **当前不是 LLM**：Profile extraction 是可审计规则基线；接入模型前需要确定 Provider、模型版本、密钥管理、timeout、结构化输出和评测集。
5. **请求级 preferred field**：Adapter 签名没有 `preferred_field_id` 参数，只能读取 Profile 内的 field。A 流程应在 normalize 时保存 field；若 Backend 允许 recommendation request 临时覆盖 field，应把 effective field 写入传给 Adapter 的 Profile，或扩展 Adapter 契约。
6. **人工批准仍是上线 Gate**：测试通过只证明 Schema、算术和引用关系一致，不证明来源页面内容与使用许可已经由 Team Lead 批准。

## 12. Tech 下一阶段建议顺序

### P0 联调完成条件

1. Team Lead 对两个来源和一个课程完成真实审核；
2. Backend 导入批准后的数据并设置三个环境变量；
3. Frontend 完成一次 A 流程真实演示；
4. 保存输入、Snapshot ID、分项分数、Evidence ID 与结果截图作为验收证据。

### P0 稳定后

1. 扩展可比的 Data Analyst Snapshot 历史序列；
2. 增加 `skill_python`、`skill_validation` 的真实趋势信号；
3. 增加 `role_business_analyst`，但必须先确定官方来源与映射方法；
4. 为 extraction 建立人工标注评测集，再选择 LLM；
5. 增加模型超时、格式错误、低置信度和降级路径测试；
6. 最后再进入 B1/B2 和 P1。
