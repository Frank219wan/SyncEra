# 外部评审修复记录

日期：2026-10-21
分支：`feature/tech-integration`

## 结论

代码层 P0 集成问题已修复并纳入自动化验证。候选市场 Snapshot 与课程资源仍是 **TECHNICAL PASS — PENDING TEAM LEAD HUMAN APPROVAL**；本次修改没有绕过、伪造或代替治理批准，也没有执行远端 Replit 部署。

## 评审项与处理

| 评审问题 | 修改 | 验证 |
|---|---|---|
| Backend 与 Tech 各自维护评分公式，可能漂移 | 新增 `backend/app/matching.py` 作为唯一可复用的评分、优势、差距和排序实现；Tech 评分与 Backend 校验共同调用 | Backend 全套测试 |
| Adapter 输出只校验 Schema／总分，解释可能与画像或 Snapshot 不一致 | Backend 独立复算四个分数组件，并逐项核验角色名、情景乘数、优势、Skill Gap、Evidence、SDG、排序与连续名次 | 新增“语义错误解释必须被拒绝”回归测试 |
| Frontend real mode 丢失评分解释与证据 | 推荐映射保留 score breakdown、reason、evidence IDs、scenario assumptions、uncertainty、SDG；并按 Evidence ID 查询详情 | Frontend 契约测试 + live API contract |
| Mind Map／Roadmap 仍显示固定 9h、30h、10 checkpoints 与固定核验日期 | 改为服务返回的节点、总时长、容量、可行性、警告、任务数和资源 `verified_at` | TypeScript／生产构建 + live API contract |
| v1.0 目录外的前端技能在画像往返后消失 | 仅向 Backend 发送 canonical skill IDs，合并响应时保留本地未支持技能 | Frontend 契约测试 |
| CI 只覆盖 Backend，前端契约变更不会触发 | 工作流增加 Frontend 测试／构建，以及启用真实 Tech Adapter 的 normalize→roadmap 联调作业 | `.github/workflows/backend-ci.yml` |
| 根 `.replit` 只启动 API，无法一键演示 UI | `scripts/run-replit.sh` 同时启动 loopback FastAPI 与公开 Vite，Vite 同源代理 `/api` | 本地 live API contract；远端部署待 Team Lead |

## 当前验证结果

- Backend + Tech：37 passed，0 failed，0 skipped；另有 1 条 Starlette/AnyIO 依赖弃用警告。
- Frontend 领域／契约测试：13 passed，0 failed。
- 启用 `futureproof_ai.futureproof_adapter` 的 live API contract：1 passed，覆盖画像到路线图主链。
- Frontend 生产构建：由本地与 CI 执行；若本机依赖安装被最小发布时间策略暂时阻止，不得放宽策略，待依赖超过安全窗口后复跑。

## 仍需人工／外部动作

1. Team Lead 独立打开并审核候选文件记录的 DOSM、TalentCorp 与 Microsoft Learn 精确 URL。
2. 用真实审核人和审核时间生成 reviewer-owned approval manifests，再通过 import CLI 导入并设置 `ACTIVE_SNAPSHOT_ID`。
3. 在 Replit 上部署并实际验证 UI、`/api/v1/health`、跨刷新 SQLite 行为及外部可访问性。
4. P1 Organization、进度写回、认证授权和生产数据保留策略另行实现。
