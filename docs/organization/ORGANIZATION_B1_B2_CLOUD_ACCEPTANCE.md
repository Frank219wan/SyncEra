# Organization B1/B2 Protected Preview 验收记录

**状态：BLOCKED；PROTECTED PREVIEW ACCEPTED = NO。** 本记录截至 2026-10-23 18:10 UTC。只读检查、本地测试和 CI 不能替代 Neon 写入或真实 Cloud E2E 证据。

## 范围与来源

- Repository：`Frank219wan/SyncEra`。`origin/main` 为 `199523f0a48dc1a25588371f7cb44fde3588f79e`。本轮 `git fetch origin --prune` 已执行。
- PR #36：`feature/organization-mvp`，本轮测试安全修复代码 SHA `522f8990ce8970d45b21cd006a74d555d199a760`。PR #37：`feature/organization-b1-hr`，包含 #36 并保留以 #36 为 Base；本轮 B1/B2 HTTP 测试代码 SHA `5779464205a24b98f49a3288e75c43fcc712dcad`。报告本身的提交会形成更新的 HEAD；以 GitHub 最终 HEAD 和对应 CI 为准。
- 本轮没有执行 `--apply-preview`、任何 Neon DDL/DML、Vercel 部署、WAF 发布、PR 合并、Production 修改或 MiniMax 调用。没有建立本轮合成 Workspace，因此无待清理记录。
- 实际 `DATABASE_URL` 从用户提供的当前用户 0600 普通临时文件读入进程内存，没有写入仓库、命令参数或本报告。受控 CA 使用 Python `certifi.where()`，没有输出证书内容、连接串或 Secret。

## Phase 1：TLS Preflight 与测试安全

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| URL Endpoint/Database 与客户端 `verify-full` | PASS | 实际应用 URL 的 `python -m scripts.migrate_postgres --preflight` 等效调用成功；直连 Endpoint 为 `ep-summer-waterfall-aoweosnc.c-2.ap-southeast-1.aws.neon.tech`，`current_database()=syncera_preview`。 |
| 客户端 TLS / 证书与主机名校验 | PASS | `sslmode=verify-full` 加显式可信 CA 连接成功；`db.pgconn.ssl_in_use=True`。错误 CA 的真实连接在此前只读验收中被拒绝。 |
| 服务端 `pg_stat_ssl` | PASS（独立诊断） | 同一连接返回 `false`；脚本不把它误判为客户端无 TLS，也不据此推断服务端链路。 |
| 迁移写入连接独立校验 | PASS（单元测试） | 第二条连接若无 TLS 或数据库身份错误，迁移调用前失败；真实写入连接尚未执行。 |
| PostgreSQL 测试安全 | PASS | 移除 `test_organization_postgres.py`、`test_postgres_integration.py` 中对任意 `TEST_DATABASE_URL` 的隐式 `apply_migrations()`；测试仅接受指定直连 Preview，经只读身份与 Schema 检查，并为后续连接强制 `verify-full`。真实缺表 Preview 上门槛返回 `Preview test schema is incomplete`，未写入。 |

当前 `backend/scripts/migrate_postgres.py` 中 Project/Branch ID 是硬编码的**预期值**，不是运行时控制面证明。此前 2026-10-24 的独立 Neon 控制面只读验收报告已核对 Project `aged-surf-56749653`、Branch `br-falling-glade-aox9nfes`、Endpoint 和 Database；**本轮危险操作前尚未重新从 Neon 控制面取得实时归属证据**。当前 Work 浏览器控制被禁用，且本轮没有 Neon 控制面连接器，因此 Project/Branch 的本轮复核为 **BLOCKED**。

## Phase 2：Neon Preview

| 项目 | 状态 | 证据／阻塞 |
| --- | --- | --- |
| 独立控制面 Project/Branch/Endpoint/Database 复核 | BLOCKED | 无当前可用的 Neon 控制面访问。URL、脚本常量或数据库 SQL 不能单独证明 Project/Branch 归属。 |
| 迁移前只读 Schema 基线 | PASS | `public.profiles` 和 `public.career_analysis_calls` 存在；列类型、非空、主键、检查约束与 001/002 相容；002 的两个索引存在。四张 Organization 表不存在；现有角色对 `public` 有 CREATE 权限。只读取元数据，未读取业务正文。 |
| 001 / 002 / 20261023_04 静态兼容性 | PASS（只读） | 001/002 与上述已存在结构匹配；04 的四张表及计划索引尚未存在。真实 DDL 执行效果仍为 NOT VERIFIED。 |
| `--apply-preview` / 四张表验证 | BLOCKED | 控制面复核未完成；遵守“无法证明唯一 Preview 时停止危险操作”。没有执行迁移。 |
| 真实 PostgreSQL 持久化、并发 CAS、HTTP 409、B1/B2 隔离 | BLOCKED | Organization Schema 尚未迁移；真实写入测试会 fail closed。已添加跨进程 B1/B2 HTTP 回归测试，待迁移后用已核验 `TEST_DATABASE_URL` 运行。 |
| 本轮合成数据清理 | PASS（无需操作） | 本轮未创建任何 Neon 合成记录；没有执行 DELETE。 |

## Phase 3：受保护的 Vercel Preview

| 项目 | 状态 | 证据／阻塞 |
| --- | --- | --- |
| 自动 Git 部署关闭 | PASS（代码配置） | 根目录和 `backend/vercel.json` 均保留 `git.deploymentEnabled=false`。 |
| Backend/Frontend Preview 部署及 Deployment ID | BLOCKED | Phase 2 尚未通过；未部署，也未获取 Deployment ID 或真实 Preview Hostname。 |
| 同源 Proxy 安全静态检查 | PASS（本地） | `server/proxy.ts` 限 GET/POST 路由、查询参数、合成数据、请求/响应大小、Origin、超时和进程级限流；绕过凭据只在 Serverless Function 请求头中使用。 |
| #37 Backend Host 精确白名单 | BLOCKED | 当前正则允许既有 Integration 和 `feature-organization-mvp` 形态，尚未包含 #37 的独立 Backend Host。必须先取得实际 Backend Deployment URL/alias，再精确添加并重新测试、提交及部署。不得猜测 Host 或允许 `*.vercel.app`。 |
| Frontend/Backend Preview Authentication、环境变量隔离 | NOT VERIFIED | 无 Vercel 控制面/已认证 CLI 证据；未配置任何 Preview Secret。Frontend Authentication 未证实前，不能配置 Backend Bypass Secret。 |
| Preview-only WAF 规则、429、Firewall Event | NOT VERIFIED | 未发布 WAF；本地 Proxy 429 不能冒充 Vercel Firewall 429。 |
| Secret 未泄漏 | PASS（本轮操作范围） | 本轮没有输出或提交 Secret；部署和浏览器打包/日志验证尚未执行。 |

## Phase 4：Organization Cloud E2E

**全部 BLOCKED。** 当前没有本轮 Frontend/Backend Preview Deployment ID；也没有 Organization 数据库 Schema。不能将本地 FastAPI、SQLite/内存仓库或 CI 当成真实 Frontend → Proxy → Backend → Neon 的证据。

待测项：B1 Department-only `unknown` 与 `coverage_percent=null`、B1 Employee Baseline/Mobility、60/25/15 评分、Training、B2 Student Recommendations/Skill Gap/Cohort、Moderate/Fast、两模式 Revision CAS 及 409、真实 API 故障无 Demo 回退、匿名 Authentication、Proxy 未批准路径与大小限制、真实 WAF Event、敏感信息审计、精确清理。每项 Cloud 证据须记录 UTC 时间、部署 ID/源 SHA、HTTP 状态、Request ID、合成 Workspace ID、Revision 及 PostgreSQL 回读；本轮均未伪造这些值。

## 已完成的本地与 CI 验证

- #36 Backend：`154 passed, 3 skipped`。#37 Backend：`159 passed, 4 skipped`；跳过的均为未提供 `TEST_DATABASE_URL` 的真实 PostgreSQL 写入测试。迁移 Preflight 与测试安全单元测试：`25 passed`。真实 Preview 缺表门槛：按预期拒绝写入测试。
- #37 Frontend：`corepack pnpm install --frozen-lockfile` PASS；`corepack pnpm test` 为 `88 passed`；`corepack pnpm exec tsc -b` PASS；`VITE_API_MODE=real corepack pnpm build` PASS。
- #37 本地合成 FastAPI + React 契约测试：`tests/cross-stack.test.ts` 为 `4 passed`。该测试使用本机 SQLite/内存路径与规则 AI 适配器，**不是** Neon 或 Vercel Cloud E2E。
- `git diff --check` PASS。#36 代码 SHA `522f899...` 的 GitHub 四项检查均为 `success`；#37 代码 SHA `5779464...` 的 Integrated CI 为 `success`。报告提交后的最新 SHA 必须重新核对 CI。

## 后续安全顺序

1. 恢复独立 Neon 控制面可读访问，重新核对 Project、Branch、Endpoint、Database 归属；用实际应用 URL 和受控 CA 再做只读 Preflight 与 Schema 基线比较。
2. 只在目标仍为授权 Preview 且 001/002/04 相容时，执行一次受审查的 `--apply-preview`。失败时先只读核对事务与 Schema，不盲目重试。
3. 只用本轮合成记录运行 PostgreSQL/HTTP/并发 CAS 测试和精确清理；任何残留只报告 ID，不扩大 DELETE 范围。
4. 待 #36/#37 最新 SHA CI 通过，核对现有 Vercel 项目 Root Directory、Preview Authentication 与环境隔离；再从干净相同 SHA 手动部署 Backend Preview。
5. 用实际 Backend Host 完成 Proxy 精确白名单，重新提交、跑 CI 并手动部署最终 SHA；Frontend Authentication 验证通过后才配置服务器端 Bypass Secret 和部署 Frontend Preview。
6. 仅在能严格限定 Preview Host 时发布 WAF，取得真实 Firewall Event；再以合成数据完成 B1/B2 Cloud E2E 和精确清理。

**Production Frontend、Production Backend、Production Database 未由本轮操作修改；MiniMax 付费调用：NONE。** PR #36/#37 未合并。建议合并 #36：NO；建议合并 #37：NO。独立 Reviewer Approval 尚未请求。
