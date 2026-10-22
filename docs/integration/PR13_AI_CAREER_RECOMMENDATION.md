# Draft PR #13 · AI Career Recommendation 设计与验收

日期：2026-10-22（Asia/Kuala_Lumpur）。范围：`integration/postgres-preview-backend` 的现有推荐流程；Production、Profile Store 和 tech-v1 算法不变。**本轮没有向 Tencent TokenHub 发出真实请求，也没有启用付费开关。**

## 最小改动设计

1. `/api/v1/recommendations` 原有确认画像、快照、字段过滤、tech-v1 评分、Skill Gap 和后端语义校验顺序不变。只有通过 `tech-v1` 校验的前 5 个候选可进入独立的 `CareerAnalyzer`；匹配分、分项分和列表顺序完全来自 tech-v1。
2. 版本兼容：旧请求不带 `X-Recommendation-Analysis: v1`，响应继续满足原 OpenAPI v1.0 的严格字段集合。带此请求头时，`data.ai_analysis` 为新增字段；旧后端会忽略请求头，新前端可接受缺少该字段。`meta.model_version` 仍表示评分版本 `tech-v1`；分析对象单独记录 `source`、`status` 和 `model_version`。
3. 模型输入只含已确认合成画像的职业、技能等级、兴趣、目标领域；候选职业与技能要求；tech-v1 分数和缺口；允许的趋势分数、证据 ID、所选 Moderate/Fast 倍率及不确定性。不发送原始 CV、自由文本、姓名、Profile ID、数据库连接信息或密钥。Pydantic 严格校验模型 JSON，职业 ID 必须在候选中，优势和缺口技能 ID 必须属于该候选，证据 ID 必须在已发送集合中。模型解释仅展示在独立分析区，绝不覆盖 tech-v1 的评分或证据字段。
4. 降级：功能关闭、Provider 故障、格式错误、候选非法、输入超限、限流或另一个请求正在处理时返回 `source=rules_fallback` 和明确 `status`。只有有效 MiniMax 响应才能标记 `source=minimax, status=success`。
5. 付费保护：默认 `ENABLE_LIVE_CAREER_RECOMMENDATION` 未设置；真实调用必须同时具备显式开关、Vercel Preview、服务端密钥、tech-v1 和共享 PostgreSQL 预约表。每个内容键在网络调用前原子预约；网络或持久化结果不确定时保留预约，重试不会再次收费。成功 JSON 缓存在同一表。每个画像 24 小时最多 3 个新调用，所有实例合计每分钟最多 10 个；请求前最多 5 个候选、16 KB 输入、600 输出 token、8 秒超时；HTTP 客户端不重试。启用前须运行 `002_career_analysis.sql`。这提供“至多一次尝试”，故失败后的同键请求需要人工处理或输入版本变化才能再试。
6. 前端只在原推荐页增加简短分析区，显示来源、候选方向、理由、优势、缺口、不确定性和已有证据链接。规则降级明确写出“未使用 MiniMax”。旧后端缺少分析字段时仍显示原职业卡片。

## 验收结果

| 检查 | 结果 |
| --- | --- |
| 原版 OpenAPI v1.0 严格响应形状（无版本请求头） | PASS |
| MockTransport 输入边界、JSON/Pydantic、候选职业与技能/证据 ID、缓存和重复请求 | PASS |
| MockTransport 超时、HTTP 错误、无效输出、规则降级及 Production 调用闸门 | PASS |
| 后端全套本地测试 | PASS：99 passed，1 skipped（需要独立 `TEST_DATABASE_URL` 的 PostgreSQL 实库测试） |
| 前端测试与构建 | PASS：49 tests；TypeScript/Vite build |
| 真实 TokenHub / MiniMax 调用 | **NOT VERIFIED**；未授权，未调用，开关保持关闭 |
| Neon Preview 迁移与跨实例预约实测 | **NOT VERIFIED**；未修改 Preview DB，`002` 仅在代码中待运行 |
| PR Draft 状态 | PASS：GitHub API 显示 #13 仍为 open、Draft，head 为 `41725c2`（提交本变更前） |
| Cloud Preview E2E 与 Production 状态复核 | **NOT VERIFIED**；本地实现与 MockTransport 结果不能代替云端验收 |

## 上线前边界

任何付费调用都需要单独授权。启用前运行迁移、复核 Preview 隔离和 WAF、在受保护的 Preview 上验证跨实例预约与响应元数据。模型理由属于受限的自然语言说明；结构化职业、技能和证据 ID 有硬校验，自由文本中的事实正确性仍需人工和证据复核。PR #13 保持 Draft，不合并。
