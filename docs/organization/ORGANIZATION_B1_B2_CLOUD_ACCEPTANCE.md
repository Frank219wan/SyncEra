# Organization B1/B2 Protected Preview 验收记录

2026-10-24 最终故障验收补充：见 `ORGANIZATION_FINAL_FAILURE_GATES_20261024.md`。其记录了新的 B1 异步 CAS 身份保护修复、浏览器故障拦截与真实 Backend 故障仍未验证、近期日志窗口限制，以及一项独立 Vercel 项目误部署事件。本页较早的验收结论不得覆盖该补充报告。

更新：2026-10-24。**当前修复 SHA 的 B1/B2 主要 Cloud UI 回归已通过；整体受保护 Preview 验收仍为 BLOCKED，ACCEPTED = NO。** ORG-FE-001／002 已经本地测试、独立代码审查及受保护浏览器验证。浏览器网络拦截模拟的超时／500／断网、恢复后重试和独立 Preview-only Backend 故障注入尚未完成。Vercel Function 日志可查时间范围有限。下表只记录实际完成的检查。

## 本轮 B2 收尾修复（待最终 Cloud 验收）

| 项目 | 结果与边界 |
| --- | --- |
| ORG-FE-001 | Real B2 的 Trends、Gaps、Insights 仅在当前 `career_centre` 服务端分析存在时显示结果；否则显示空状态、错误和重新分析入口。局部 `gapsFor`／`cohortGaps` 的可见路径仅留给 Demo。Real 模式本地页面已逐页查看。 |
| ORG-FE-002 | 分析必须同时匹配当前 `revision`、`scenario`；旧结果、旧 Snapshot 标签和 Demo Workshop 均隐藏。发起请求后修改输入，响应仍可更新同一工作区的 CAS token，但不能显示旧结果；响应属于其他工作区时不能覆盖现有身份。 |
| 本地 Frontend QA | 新增六项 B2 状态回归：6/6 PASS；全套 96/96 PASS。Real 模式本地构建、TypeScript PASS。 |
| Backend／Cross-stack | Backend 全套 159 passed、4 skipped；Cross-stack 4/4 PASS。均使用合成输入与确定性适配器，未访问 Neon 或付费 AI。 |
| 队友 Offline QA Patch | 本轮未找到可独立核验的本地 Patch 或 Commit；上述六项为当前工作区新增测试，不能冒称已导入队友的两个失败测试。 |
| 独立代码审查 | 独立 Reviewer 对最终代码 SHA `d76afe9…` 复核通过，无 P0/P1 阻塞；提出的 CAS token 丢失已修复，首次分析期间禁用示例数据重载。该结论是代码审查，不等于 GitHub 正式 Approval。 |

**本轮双端 Preview Ready、GitHub CI、同源 Health 和 B1/B2 当前分析失效已验证。浏览器网络拦截、真实 Backend 故障和完整 Function 日志审计仍不能标记 PASS。**

## 本轮最终代码 SHA 的验收增量

| 项目 | 结果与证据 |
| --- | --- |
| 提交与 CI | `feature/organization-b1-hr` 的修复代码 SHA `d76afe947787bd0cd0a7b1747159cb00f3b112f4` 已推送至 PR #37；GitHub `integrated` Check 对该 SHA 为 `completed/success`，Frontend／Backend Vercel 状态均 `success`。本报告后续文档提交会产生更晚 PR SHA；需单独核对该 SHA 的 CI。 |
| 双端受保护 Preview | Frontend `dpl_BiSToeVKKhREM1w3mNGvYtzTYV9K`、Backend `dpl_B9Tsb5MVCaranbQWzuzMFjNReoHj` 均 Ready，均由上述 Git-ref SHA 部署，仅 Preview；Frontend 同源 `GET /api/v1/health` 返回 FastAPI 200 JSON。此前 B1/B2 Cloud 主链路的通过记录属于较早的 `f5a995c…` 版本。 |
| 本地与 CI QA | 新增 B2 状态测试 6/6 PASS，Frontend 全套 96/96 PASS，TypeScript 与 Real 模式 Build PASS；Backend 159 passed、4 skipped；Cross-stack 4/4 PASS。独立工作区的 `corepack pnpm test` 因复制的 `node_modules` 在非 TTY 下被 pnpm 拒绝清理而未直接完成；按 `package.json` 的同一 Node 测试命令执行通过，GitHub `integrated` Check 成功。 |
| JS 凭据标记扫描 | 对本轮 Real 模式构建的全部 Frontend JS（1 个文件）扫描：未发现 Bypass Header 名、服务端 Secret 环境变量名、`DATABASE_URL`、Backend 分支 Alias 或 Neon 域名。该扫描只证明检查范围内未发现这些标记，不证明完整日志历史无泄漏。 |
| 当前 Cloud UI | 浏览器控制恢复后，已在当前代码 SHA 的受保护 Preview 实测 B1/B2 当前分析、Revision 失效、B2 Moderate→Fast 情景失效与重新分析、B2 无分析空状态。下节列出可复核证据。超时／500／断网和恢复后的重试仍未完成。 |
| Function Logs | Vercel CLI 对 `--since 8h` 和 `1h` 返回超出可用保留窗口；`--since 10m` 可查。UTC 2026-10-24 01:08:06–01:18:06 的新部署日志中，Frontend 和 Backend 各有一次 `GET /api/v1/health` HTTP 200，请求日志可见；该窗口两端 Runtime Log 均为 0 条。只审核了该 10 分钟窗口的结构化元数据，历史与其他请求的 Secret Redaction 为 `NOT VERIFIED`。 |
| Cloud 故障验证 | Browser Network Interception：`NOT VERIFIED`；Actual Backend Failure：`NOT VERIFIED`。未关闭 Authentication、未使用 Production 故障注入。 |

## 当前修复 SHA 的受保护 Cloud UI 回归（2026-10-24）

| 检查 | 实测结果与边界 |
| --- | --- |
| B2 无分析、无 Demo 回退 | 分支 Alias 的 Trends、Gaps、Insights 在 `API data pending` 时均显示 `Current student analysis required`、`No connected snapshot yet` 与 `Analyze again`；未见本地 Career／Gap／Workshop。 |
| B2 当前分析 | 使用页面内 6 名虚构学生执行 `career_centre` Moderate，Backend HTTP 200、Request `jhc6j-1792805414458-ecfeee50cbfb`；当前 Trends／Gaps 显示服务端 `organization-b2-v0.1` 与合成 Snapshot。Neon 精确回读 Workspace `org_5df2556d896147a3` Revision 1。 |
| B2 Scenario 失效与恢复 | Moderate→Fast 后，旧 Snapshot、推荐和 Gap 隐藏，显示重新分析入口；再分析 Backend HTTP 200、Request `srcw5-1792805462563-ef8dda7aa932`，同一 Workspace Revision 2、`fast`，页面恢复当前结果。 |
| B2 Cohort 与 Revision 失效 | 选择 STU-001／STU-002 运行服务端 Cohort，Backend HTTP 200、Request `87lbk-1792805527380-e2bdb0b4a1a0`，同一 Workspace Revision 3；Insights 显示服务端 Skill Gap、Workshop、Curriculum。修改虚构机构资料后，旧 Cohort／Workshop 和 Snapshot 隐藏，显示重新分析入口。 |
| B1 当前分析与 Revision 失效 | 为避免已清理旧 Workspace ID 的浏览器本地状态干扰，使用同一部署的独立 URL 和新来源载入合成 HR 示例；Backend HTTP 200、Request `4hstv-1792805683926-d6612fe920f9`，Neon Workspace `org_3a9f6c9685154d00` Revision 1；Dashboard 可见服务端 `organization-b1-v0.1`。修改并保存虚构资料后，Dashboard／Heatmap 隐藏旧结果；重新分析 HTTP 200、Request `cbg7z-1792805748142-79a38f9d74bc`，同一 Workspace Revision 2，当前结果恢复。 |
| 真实 CAS 错误 | 保留已清理旧 Workspace ID 的另一浏览器来源触发 Backend HTTP 409、Request `wk228-1792805585240-e2cf0eefe115`；前端显示 Revision 过期错误与 `Try again`，没有显示 Demo 分析。此检查是 CAS 错误处理，不代表超时、HTTP 500、断网或真实 Backend 停机验收。 |
| 当前 SSO | 对 Frontend／Backend 分支 Alias 的匿名 `GET /api/v1/health` 均得到 HTTP 302；授权浏览器及 CLI 的同源 Health 为 200。未更改 Authentication。 |
| 本轮 Neon 精确清理 | 测试前四张 Organization 表均 0 行。经 `verify-full`、客户端 SSL、Preview 目标、`synthetic_input`、Demo 标签、Mode 和 Revision 核验后，仅删除上述两个合成 Workspace 与其 5 条分析；四张 Organization 表复查均回到 0 行。未重复 Migration。 |
| 本轮日志与凭据 | UTC 01:26:27–01:36:27 可得的请求日志：Backend 六次 Organization 请求为 5×200、1×409；Frontend 同源对应请求可见。双端该窗口 Runtime Log 为 0 条。请求日志字段只有路由、状态、Request ID 等元数据；两个测试浏览器控制台 0 条记录，本轮 JS 标记扫描无 Secret 命中。更早日志及可能的异常 Runtime 内容仍 `NOT VERIFIED`。 |
| 网络拦截与真实故障 | 当前浏览器控制接口无请求拦截能力；未模拟超时、HTTP 500 或断网，也未设置独立 Preview-only Backend 故障注入。因此 Browser Network Interception 与 Actual Backend Failure 均 `NOT VERIFIED`，恢复后重试同样 `NOT VERIFIED`。 |

## 版本与安全边界

| 项目 | 实际值 |
| --- | --- |
| 核对的 `origin/main` | `199523f0a48dc1a25588371f7cb44fde3588f79e` |
| PR #36 | `feature/organization-mvp`，`17b75f16ac64336909c0743aa0262eb52a05ff47` |
| Cloud 部署源代码 | 当前双端部署 `d76afe947787bd0cd0a7b1747159cb00f3b112f4`；以下较早的全链路证据属于 `f5a995c0d06a132c67d7f2bdb88ad8912202abba`，不能代表修复版本的全部 UI 验收；本报告后续提交只改文档，不代表重新部署 |
| Production | 本轮未部署或修改 Production、main、Production 环境变量或数据库；两个 `git.deploymentEnabled=false` 保持不变 |
| 数据边界 | 仅虚构组织、学生与合成角色资料；未启用付费 MiniMax 或未审查 DOSM 数据导入；不能将合成结果称为已核实市场事实 |

## Phase 1：TLS 与只读 Preflight

| 检查 | 状态 | 证据 |
| --- | --- | --- |
| Neon 身份 | PASS | 控制面独立核对 Project `aged-surf-56749653`、Branch `br-falling-glade-aox9nfes`、直连 Endpoint `ep-summer-waterfall-aoweosnc.c-2.ap-southeast-1.aws.neon.tech`、Database `syncera_preview`。脚本硬编码 ID 仅为预期值。 |
| 客户端 TLS、证书、主机名 | PASS | 实际应用连接采用 `sslmode=verify-full` 与受控可信 CA，libpq `ssl_in_use=true`；错误 CA、Host、关闭 TLS、无效 CA 回归测试 fail closed。连接串来自当前用户 0600 临时文件，未输出。 |
| 目标和 Schema | PASS | `current_database()=syncera_preview`，Endpoint 与控制面一致；只读 `--preflight` 成功；001／002 现有 Schema 与增量 Migration 相容。 |
| 服务端 `pg_stat_ssl` | PASS（独立诊断） | 该视图返回 `false`，与客户端 TLS 状态分开记录，不据此否定 `verify-full`。 |
| 写入连接保护 | PASS | `--apply-preview` 使用的第二条实际写入连接重新核对目标身份、TLS 和 CA；替换连接失效路径有回归测试。PostgreSQL 测试不隐式迁移。 |

## Phase 2：Neon Preview Migration 与持久化

| 检查 | 状态 | 证据 |
| --- | --- | --- |
| 001、002、`20261023_04` | PASS | 仅在上述授权 Preview 目标执行一次经审查的 `--apply-preview`；未迁移其他数据库。 |
| 六张表 Schema | PASS | 迁移后只读核对原 Profile／Career Analysis 两表，及四张 Organization 表的 PK、FK、Unique、Revision、mode、JSONB 约束和索引。 |
| 真实 PostgreSQL | PASS | Organization HTTP／数据库专项 `2 passed`，既有 Profile PostgreSQL 测试 `11 passed`；跨进程和新连接回读 Revision／分析条目。 |
| 并发 CAS、409、Mode 隔离 | PASS | 两个并发更新仅一个成功；旧 Revision 返回 `REVISION_CONFLICT`；B1／B2 独立。Cloud 两种模式也分别验证 Revision 1→2→旧 Revision 409。 |
| 精确清理 | PASS | 按本轮六个已知合成 Workspace ID 清理其记录及 7 条分析；四张 Organization 表最终各 0 行，`profiles=11`、`career_analysis_calls=0`，与测试前基线一致。未删除未知记录。 |

## Phase 3：受保护 Vercel Preview（下表为较早的 `f5a995c…` 全链路验收）

| 检查 | 状态 | 证据 |
| --- | --- | --- |
| Backend | PASS | 现有 `syncera-backend`，Root Directory `backend`；Deployment `dpl_28tBmgBH95u6VMj8BvLqLyB9tAyk` Ready，源 `f5a995c…`；[精确分支 Alias](https://syncera-backend-git-feature-organization-b1-hr-frank219wan.vercel.app)。 |
| Frontend | PASS | 现有 `syncera-frontend`，Root Directory `.`；Deployment `dpl_GCsxKzc7X4ASmTL3cZcuUgsiSmpZ` Ready，源 `f5a995c…`；[精确分支 Alias](https://syncera-frontend-git-feature-organization-b1-hr-frank219wan.vercel.app)。 |
| 环境变量隔离 | PASS | 仅 #37 Preview 分支配置 Backend Preview 数据库／运行变量和 Frontend 服务端 Origin／Bypass Secret；未使用 `VITE_` 存放 Secret。初次无分支环境的 Backend CLI 部署不作为验收证据；以上 Git-ref 部署才有效。 |
| Proxy、Auth、安全边界 | PASS | 同源 `GET /api/v1/health` 为真实 FastAPI 200 JSON；Proxy Backend Host 为精确白名单。两个项目均 `Require Log In`，匿名 Health 均为 302 至 SSO。未批准 `/api/v1/admin` 为 404；`synthetic_input=false` 为 422 `SYNTHETIC_ONLY`；超 64 KB 请求为 413 `REQUEST_TOO_LARGE`。 |
| Preview-only WAF | PASS | Backend 规则 `org-preview-api-rate-limit` 同时限定精确分支 Alias 与 `/api/v1/`，每 IP 60 秒 10 次，动作 429；已发布。12 次受控授权 Health 请求：10×200、2×429；Vercel Firewall Traffic 显示该规则 `Rate Limited 2`，非 Proxy 内存限流。精确 Host 条件排除 Production Host。 |
| 凭据可见性 | PASS（已检查范围） | 扫描已部署 Frontend JS bundle：未见 Bypass Secret 变量名／Header、`DATABASE_URL`、Neon Host 或 Backend Alias；浏览器请求保持同源。未输出或提交 Secret。近期 Vercel 日志仅返回有限元数据，完整 Function 日志历史审计为 `NOT VERIFIED`。 |

## Phase 4：Frontend → Proxy → FastAPI → Neon（较早的 `f5a995c…` 验收）

下列请求通过同一 `f5a995c…` Preview 版本和 Frontend 同源 `/api/v1/*`；Neon 用新 TLS 连接按精确合成 ID 回读。响应标记 `data_label=synthetic_demo`、`is_mock=true`：HTTP、计算和数据库持久化是真实链路，角色目录和输入是合成资料。

| 流程 | 状态 | 脱敏证据 |
| --- | --- | --- |
| B1 部门仅有资料 | PASS | UTC 2026-10-24 00:17:49，HTTP 200，Request `req_e6a1cacefcec487e9b0b41318fe7c141`，Workspace `org_a8b53b778150430d`；0 个已知技能基础，Coverage `unknown`、百分比 `null`，无虚构缺口／个人 Mobility，Training `review_required`。 |
| B1 空技能／未知基础 | PASS | UTC 00:18:20，HTTP 200，Request `req_0a64503004c94627a131309b081a3c41`，Workspace `org_9c738cc4cb23439b`；`baseline_known=true, skills=[]` 未产生个人 Mobility。另一个 B1 例子仅 1 个已知 Profile 进入覆盖分母，未知 Profile 未被计作缺失。 |
| B1 Heatmap／Mobility／Training | PASS | B1 HTTP 200，Workspace `org_a948cf9bc3ac48c2`，Request `req_fe8165a910454b6d851d54182d241e5c`；API 返回部门覆盖、验证比例及可审核 Mobility。React 页面实测 Skill Heatmap、Internal Mobility、Enterprise Training；合成小时数有标记，`budget_status=not_assessed`，人工审核 `required`。 |
| B1 60/25/15、Moderate/Fast | PASS | UTC 00:18:27，Fast HTTP 200，Request `req_7239db512b2c471e9795b4011f2d02b2`，Workspace `org_a0529b838c164258`；Skill 62.5、Transition 38.33 不变，Scenario 78→84.24，Score 62.75→64.31；按既有 60/25/15 规则取两位小数一致，Gap 数 2 不变。个人 Mobility 不是录用决定。 |
| B2 Student／Skill Gap／Action Plan | PASS | UTC 2026-10-23 18:48:33，HTTP 200，Request `req_d24c5b1859c74193b6722a4dd96f16f5`，Workspace `org_c4a2f788c53a4128`；2 名合成学生各 3 条 Recommendation，含 Skill Gaps／Action Plans；B2 独立 `organization-b2-v0.1` 政策。 |
| B2 Cohort／Workshop／Curriculum | PASS | Cohort 2 名学生、3 个 Workshop、Curriculum Supplements，`human_review_status=required`；React 页面实测 STU-001／STU-002 选择、Cohort 分析和 Institution Insights。 |
| B2 Moderate/Fast | PASS | UTC 00:18:37，Fast HTTP 200，Request `req_3925d873b6004c23beaf876ff0876474`，Workspace `org_6d43ee00df944228`；首条 Recommendation 的 Skill 50、Interest 60、Goal 20、Work Style 60、Transition 53.75 不变，Scenario 77→76，Score 55.16→54.96；未套用 B1 权重。 |
| Cloud Revision CAS／持久化 | PASS | B1／B2 均为 Revision 1→2，旧 Revision 409 `REVISION_CONFLICT`；Neon 新连接读回各 Revision 2、各 2 条分析。React UI 另产生两个合成 Workspace，亦按精确 ID 回读并清理。 |
| 受控 Backend 故障、前端重试、旧结果失效 | NOT VERIFIED | 尚未在真实 Cloud 受控制造 Backend 不可达或错误，不能证明页面无 Demo 回退、会清空旧分析并提供重试。本地测试不能替代该项。 |
| 全时间窗 Function 日志脱敏 | NOT VERIFIED | 当前可查 Vercel 日志窗口只有有限请求元数据；JS bundle 标记扫描通过，但不足以证明全部历史 Function 日志无资料或凭据。 |

## 测试、CI 与结论

| 项目 | 结果 |
| --- | --- |
| `corepack pnpm install --frozen-lockfile` | PASS，依赖已是最新 |
| `corepack pnpm test` | 较早部署版本 PASS，89 passed、0 failed；本轮修复版本直接运行同一 Node 测试命令 96/96 PASS，`corepack pnpm test` 在隔离工作区受 pnpm 非 TTY `node_modules` 清理限制 |
| `corepack pnpm exec tsc -b` | PASS |
| `VITE_API_MODE=real corepack pnpm run build` | PASS |
| Backend `python -m pytest tests -q` | PASS，159 passed、4 skipped；真实 PostgreSQL 专项另为 2 passed 和 11 passed |
| GitHub CI | #36 已核对 SHA 的四项 Check 成功；#37 修复代码 SHA `d76afe9…` 的 `integrated` Check、两个 Vercel 部署状态均成功。文档新 SHA 的 CI 须另行核对。 |
| 独立 Reviewer | 对修复代码 SHA `d76afe9…` 的独立代码复核 PASS；GitHub 正式 Approval：NOT VERIFIED；PR #36／#37 均未合并 |

## 最终判定矩阵

| 验收项 | 判定 |
| --- | --- |
| ORG-FE-001／ORG-FE-002 | 本地、代码审查及当前修复 SHA 的受保护 Cloud UI PASS（已测无分析／Revision／Scenario 路径） |
| FRONTEND QA／BACKEND QA | 96/96 PASS；159 passed、4 skipped；Cross-stack 4/4 PASS |
| B1 CLOUD REGRESSION／B2 CLOUD REGRESSION | 当前修复 SHA 的合成分析、Revision 失效与恢复 PASS；故障注入路径 NOT VERIFIED |
| NO DEMO FALLBACK／STALE REVISION／SCENARIO INVALIDATION | 当前修复 SHA 的受保护 Cloud UI PASS（无分析、真实 409、B1/B2 Revision、B2 情景） |
| NETWORK FAILURE／RETRY | Browser Network Interception NOT VERIFIED |
| ACTUAL BACKEND FAILURE | NOT VERIFIED |
| FUNCTION LOG AUDIT／SECRET REDACTION | 本轮可得 10 分钟请求元数据与两个浏览器控制台检查完成，Runtime Log 0 条；JS 标记扫描通过；完整历史与异常 Runtime 日志 NOT VERIFIED |
| INDEPENDENT REVIEW | 独立代码审查 PASS；GitHub Approval NOT VERIFIED |
| NEON／SSO／WAF PREVIOUS ACCEPTANCE | 本轮精确合成写入、只读回查与清理 PASS；双端匿名 Health 302 PASS。Migration 与 WAF 仅保留较早验收证据，未重复执行／压测 |
| PRODUCTION UNCHANGED | PASS（本轮未修改 Production、main 或 Production 数据／环境） |
| PROTECTED PREVIEW ACCEPTED／READY TO MERGE #36／READY TO MERGE #37 | NO／NO／NO |

**整体状态：BLOCKED；PROTECTED PREVIEW ACCEPTED = NO；READY TO MERGE #36 = NO；READY TO MERGE #37 = NO；PRODUCTION RELEASED = NO。** 后续须在维持双端 Authentication、Preview 隔离与无付费调用的条件下，完成受控故障 UI 验证、可得范围内的 Function 日志审核及独立 Reviewer Approval，再由部署负责人决定是否合并。
