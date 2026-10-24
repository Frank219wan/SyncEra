# Organization B1/B2 Protected Preview 验收记录

**状态：BLOCKED；PROTECTED PREVIEW ACCEPTED = NO。** 更新于 2026-10-24。Neon Preview 迁移与真实持久化已通过；Vercel Cloud E2E 尚未完成。

## 目标与安全边界

- 本轮核对 origin/main 为 `199523f0a48dc1a25588371f7cb44fde3588f79e`。PR #36 为 `feature/organization-mvp`，PR #37 为叠加其上的 `feature/organization-b1-hr`。
- 独立 Neon 控制面只读核对 Project `aged-surf-56749653`、Branch `br-falling-glade-aox9nfes`、直连 Endpoint `ep-summer-waterfall-aoweosnc.c-2.ap-southeast-1.aws.neon.tech`、Database `syncera_preview`。迁移脚本内硬编码 ID 只是预期值，并非归属证明。
- 实际应用 `DATABASE_URL` 从当前用户 0600 临时文件在进程内读取；CA 使用 `certifi.where()`。没有输出或提交连接串、密码、Secret 或测试正文。
- Production、main、Neon Production 未修改；PR 未合并；无付费 MiniMax 调用，无未审查 DOSM 数据导入。

## Phase 1：TLS 与只读 Preflight

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| 客户端 TLS、CA、主机名 | PASS | 实际应用 URL 的 `--preflight` 成功；`sslmode=verify-full`、受控 CA、`pgconn.ssl_in_use=True`。错误 CA、Host、TLS 关闭、无效 CA 回归测试 fail closed。 |
| 数据库身份 | PASS | `current_database()=syncera_preview`，直连 Endpoint 与 Neon 控制面一致。 |
| 服务端 `pg_stat_ssl` | 诊断：`false` | 与客户端 TLS 独立记录，不据此否定客户端 `verify-full`。 |
| 写入连接重新验证 | PASS | `--apply-preview` 对实际写入连接再次核对目标、TLS、CA；替换连接失效路径有单元测试。 |
| 迁移前 Schema | PASS | 001/002 的已有表、列、约束、索引相容；四张 Organization 表此前不存在。 |

## Phase 2：Neon Preview

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| 001 / 002 / `20261023_04` | PASS | 在上述唯一核验目标上执行一次 `--apply-preview`，成功。未迁移其他数据库。 |
| 迁移后 Schema | PASS | 只读核对六张相关表；四张 Organization 表的 PK、FK、Unique、Revision／mode／JSONB 约束及索引完整。 |
| 真实 PostgreSQL 写入和回读 | PASS | #37 B1/B2 HTTP 测试 `2 passed`，含跨进程回读、并发 CAS、过期 Revision 409、模式隔离；既有 Profile PostgreSQL 测试 `11 passed`。均为合成数据。 |
| 精确清理 | PASS | 测试后四张 Organization 表均为 0 行；`profiles=11`、`career_analysis_calls=0`，与测试前基线一致。 |
| 测试安全门槛 | PASS | 两组 PostgreSQL 测试不再隐式迁移；仅接受指定直连 Preview，写入前核对身份和 Schema，强制 `verify-full` 和显式 CA。CA 路径含空格时做安全 percent-encode。 |

## Phase 3：Vercel Protected Preview

| 项目 | 状态 | 证据／阻塞 |
| --- | --- | --- |
| Git 自动部署 | PASS（代码） | 根目录和 `backend/vercel.json` 保持 `git.deploymentEnabled=false`。 |
| Root Directory 与 Authentication | PASS（控制面） | Frontend 根目录，Backend `backend`；两个项目均显示 `Require Log In`。最终部署还需匿名验证。 |
| #37 环境变量隔离 | BLOCKED | 必要变量目前绑定旧 `integration/career-radar-dosm-pr15`，不属于 #37。未修改旧分支或 Production 配置。 |
| 本轮 Backend/Frontend Deployment ID 与真实 Host | BLOCKED | 尚未手动部署 #37。必须取得实际 Backend Host 后再加入 Proxy 精确白名单。 |
| Preview-only WAF 与 Firewall Event | NOT VERIFIED | 尚未发布或观测真实 429。 |
| Cloud Bundle／日志凭据审计 | NOT VERIFIED | 当前 SHA 尚未部署。 |

## Phase 4：Cloud E2E

**BLOCKED。** 尚无同一版本 Frontend → 同源 Proxy → 受保护 Backend → Neon Preview 的真实链路。B1 Department-only `unknown`／`coverage_percent=null`、Employee Baseline/Mobility、60/25/15、Training、B2 Student Recommendation/Skill Gap/Cohort、Moderate/Fast、双模式 Revision 409、真实故障无 Demo 回退、匿名访问阻断、Proxy 非法路径和超大请求、WAF Event、日志脱敏及 Cloud 测试后精确清理，均待真实 Preview 验证。不能用本地或数据库专项测试替代。

## 已有本地证据与后续顺序

- #37 Frontend：`corepack pnpm test` 为 `88 passed`；`corepack pnpm exec tsc -b` PASS；`VITE_API_MODE=real corepack pnpm build` PASS。本地合成 FastAPI/React 契约测试 `4 passed`，非 Cloud。
- Backend 全量与最终 GitHub CI 需以最新提交复跑为准；上述 `2 passed` 和 `11 passed` 是真实 Preview Neon 专项测试。
- 先提交并核查 #36/#37 最新 CI；再只为 #37 Preview 分支安全配置 Secret/Config，保持 Authentication；手动部署 Backend，记录 ID、SHA 和实际 Host；精确更新 Proxy 白名单并部署 Frontend；仅在可限定 Preview Host 时发布 WAF；最后运行合成 Cloud E2E、回读和精确清理。

**建议合并 PR #36：NO；建议合并 PR #37：NO。** 尚未请求独立 Reviewer Approval。
