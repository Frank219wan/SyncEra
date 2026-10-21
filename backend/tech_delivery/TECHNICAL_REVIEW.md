# Trend Snapshot 与 Adapter 技术审核记录

> 审核日期：2026-10-21
>
> 审核状态：**TECHNICAL PASS — PENDING TEAM LEAD HUMAN APPROVAL**
>
> 适用分支：`feature/tech-integration`

## 1. 审核边界

本记录确认代码契约、公开来源、数值转录、计算公式、Schema、ID、时间字段和自动化测试。它不代替 Backend 所要求的 reviewer-owned governance approval，也不代表对来源许可、版权或组织发布政策作出法律判断。

`source_approvals_TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION.json` 与 `resource_approvals_TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION.json` 只能用于技术预检。Team Lead 必须独立打开精确 URL，填写真实 `reviewed_by` 与审核后的 timezone-aware `reviewed_at`，再导入和激活。

## 2. Adapter 契约审核

| Handoff 要求 | 实现 | 结果 |
|---|---|---|
| 模块可导入 | `futureproof_ai.futureproof_adapter` | PASS |
| 工厂 | `create_adapter() -> FutureProofAdapter` | PASS |
| provenance flag | `is_mock: bool` | PASS |
| 画像入口 | `extract_profile(text, questionnaire) -> dict` | PASS |
| 评分入口 | `score_roles(profile, trend_package, scenario) -> list[dict]` | PASS |
| 不虚构等级 | 文本命中技能时 `level=null`，用户确认后才能评分 | PASS |
| Recommendation Schema | 使用 Backend `Recommendation` 构建输出 | PASS |
| 分数算术 | Backend 再计算 0.45 / 0.20 / 0.20 / 0.15 | PASS |
| Evidence 约束 | 输出使用匹配 Snapshot 中该 Role 的精确 Evidence IDs | PASS |
| 场景隔离 | Moderate/Fast 只改变 projected outlook | PASS |

审核中发现 request-level `preferred_field_id` 没有进入 Adapter；这会让合法覆盖请求被 Backend 以 502 拒绝。本分支已把有效 field 写入仅用于评分的 Profile 副本，并增加回归测试，不修改已确认画像的持久数据。

## 3. Snapshot 审核

审核对象：`snap_my_dosm_mycol_2026q2_v1`

### DOSM Evidence

- 官方发布页：<https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026>
- 官方 PDF：<https://www.dosm.gov.my/uploads/release-content/file_20260818075305.pdf>
- 发布日期：2026-08-18
- 官方表内 Q2 2026 Business Data Analyst：3,053
- 同一 STEM 表内 Q2 最高值 Technician：6,565

复算：

```text
100 × 3,053 / 6,565 = 46.504... → 46.50
```

结果：`role_data_analyst.trend_score=46.5` 转录和计算正确。该分数只是同一官方表内的归一化信号，不是 Malaysia 全市场占比。

### TalentCorp MyCOL Evidence

- 官方入口：<https://www.talentcorp.com.my/mycol/>
- 官方报告：<https://www.talentcorp.com.my/images/uploads/publication/204/MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf>
- Data Professionals 包含 Data Analyst 与 Business Data Analyst。
- 报告把 data, analytics and database skills 列为该职业的 top specific skill family。

结果：`skill_sql` 到 database skills 的 Catalogue 映射有来源支持；`trend_score=70` 是明确标注的受控 taxonomy heuristic，不是 mention rate、增长率或市场份额。`mention_rate` 与 `change_pp` 保持 `null`，没有伪造历史趋势。

## 4. Resource 审核

- 官方页面：<https://learn.microsoft.com/en-us/training/paths/get-started-with-python-fundamentals/>
- 标题：Get Started with Python Programming: Part 1 - Fundamentals
- 页面显示：Beginner、4 modules、3 hr 12 min、English
- Snapshot 映射：`skill_python`
- 记录时长：`3.2` 小时
- 记录费用：`MYR 0`

课程页面未要求付费即可访问学习内容，但资源可用性、时长与条款可能变化，因此正式 approval 时必须再次打开页面核验。

## 5. 自动化证据

完整测试覆盖：

- Adapter 动态装载；
- 画像提取不虚构等级；
- Snapshot / Evidence / Resource 导入校验；
- Moderate/Fast 可复算且不修改观测指标；
- Evidence ID 精确传递；
- Matching Score 通过 Backend 二次算术校验；
- A 画像确认 → 推荐 → Skill Gap → Skill Mind Map；
- request-level preferred field 覆盖。

## 6. 正式激活前剩余动作

1. Team Lead 独立打开三个精确 URL；
2. 确认来源内容、映射、limitations 与允许的演示用途；
3. 生成 reviewer-owned approval manifests；
4. 运行 Backend import CLI；
5. 设置 `ACTIVE_SNAPSHOT_ID=snap_my_dosm_mycol_2026q2_v1`；
6. 在 Replit 上完成一次 A 流程真实端到端验证。

在第 1–3 项完成前，本 Snapshot 的准确状态是“技术审核通过的候选 Snapshot”，不是“已获人工治理批准的 Snapshot”。
