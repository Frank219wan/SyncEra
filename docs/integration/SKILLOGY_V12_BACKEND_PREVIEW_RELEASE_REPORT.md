# Skillogy V1.2 + PostgreSQL Preview 发布验收报告

日期：2026-10-22（UTC+08）。结论：**PARTIALLY WORKING；暂不建议合并 PR #13**。这份报告只覆盖受保护的 Preview、只使用虚构资料，没有启用付费 MiniMax。状态词统一为 **PASS / FAIL / BLOCKED / NOT VERIFIED**；Vercel Build 成功、本地测试成功与 Cloud E2E 成功分别记录。

## 版本与部署

| 检查项 | 状态 | 本轮证据 |
| --- | --- | --- |
| 1. 最新 main SHA | PASS | `0e8bffdb549a146f37d57a7946cef702eb1b891d`；先执行 `git fetch origin --prune`，随后将 `origin/main` 合并进目标分支。 |
| 2. 后端最终集成分支 | PASS | 只修改并推送 `integration/postgres-preview-backend`；已推送的合并提交为 `4bebeeabc8b7d200ae89c4e77f465ca96911d7f6`。无 force push。 |
| 3. Draft PR URL | PASS | [PR #13](https://github.com/Frank219wan/SyncEra/pull/13)，仍为 Draft；未自动合并。 |
| 4. PR #11/#12/#13 处理 | PASS | 对照 #11 `feature/vercel-fullstack-preview`、#12 `feature/postgres-preview-e2e` 与 #13。保留 #13 的单一 `PostgresProfileStore`、迁移、代理；未叠加 #11 的第二套 PostgreSQL 文件或无必要的 `backend/index.py`，未合并任何 PR。 |
| 5. Skillogy V1.2 前端保留 | PASS | 合并最新 main 后，`src/`、`public/` 相对 `origin/main` 仅 `src/services/api.ts` 的同源 `/api/v1` 根路径有差异。Preview 中看到了 V1.2 Landing、Logo/Loading、Radar、移动端导航、React Router 深层路由；刷新 Skill Map 深层路由仍可打开。 |
| 6. Backend Preview URL | PASS | [Backend 分支 Preview](https://syncera-backend-git-integration-postgres-pre-a79754-frank219wan.vercel.app)，新部署 `42WAqAMvshWNw68DGVXU4EemyvcZ` 显示 Ready。匿名请求 `/api/v1/health` 被 Vercel SSO 302 拦截。 |
| 7. Frontend Preview URL | PASS | [Frontend 分支 Preview](https://syncera-frontend-git-integration-postgres-pr-e72229-frank219wan.vercel.app)，新部署 `AiQgJmLg9jGrrU9P2iUtUhzDnRqc` 显示 Ready。匿名请求 `/api/v1/health` 被 Vercel SSO 302 拦截。 |
| 8. Preview Deployment SHA | PASS | 两个 Vercel Preview 部署详情均显示 Source SHA `4bebeeabc8b7d200ae89c4e77f465ca96911d7f6`。本文档提交会产生更新的分支 SHA；该文档提交对应部署须在推送后单独复核。 |
| 9. Neon PostgreSQL 连接状态 | PASS | Neon Project `aged-surf-56749653`、Branch `br-falling-glade-aox9nfes`（`preview`）、Database `syncera_preview` 均已确认。实际 Preview HTTP 流程产生的 Profile 出现在 `public.profiles`，Confirm 后 `revision=2`；本轮测试记录已精确删除。应用所用连接串的 **pooled/TLS 实际值**因 Vercel Secret 隐藏，仍需运维复核，不能从此项推断。 |
| 10. PostgreSQL Migration | PASS | `public.profiles` 的 `profile_id`、`revision`、`body jsonb` 和时间戳已在 Preview DB 确认；对同一 Preview DB 运行现有实库集成测试，幂等迁移执行两次并通过。迁移位于独立脚本，不在每次应用启动时运行。没有连接 Production DB。 |
| 11. Revision CAS | PASS | `PostgresProfileStore.update()` 使用 `UPDATE ... WHERE profile_id=? AND revision=?`，实库测试在多连接并发下验证一个 200、一个 409，Revision 递增为 2。**Cloud Preview 的过期 Revision 409 尚未直接请求验证**，见下方阻塞项。 |
| 12. Cloud Normalize | PASS | 新 Frontend Preview UI 以仅含虚构结构化字段、空白自由文本提交；Vercel Frontend Request Logs 记录 `POST /api/v1/profiles/normalize` HTTP 200。Neon 随后读到对应 Profile ID；请求正文和密钥未写入报告。 |
| 13. Cloud Confirm | PASS | UI 确认后进入推荐流程；Request Logs 记录 `POST /api/v1/profiles/confirm` HTTP 200；Neon 中同一 Profile `revision=2`。 |
| 14. Moderate / Fast Recommendation | PASS | 同一虚构 Profile 的两种情境在 Preview UI 返回不同的 Data Analyst 相对匹配分（Moderate 31.62、Fast 32.87）；Request Logs 记录 `POST /api/v1/recommendations` HTTP 200。Cloud 响应的 `model_version=tech-v1` 未直接截取，仍需核验；代码与本地测试显示确定性 `tech-v1`。 |
| 15. Skill Map / Roadmap | PASS | Skill Map 页面展示 SQL 10 小时、3 节点；Request Logs 记录 `POST /api/v1/learning/skill-map` HTTP 200。Roadmap 使用新建且尚存在的虚构 Profile 重算，页面展示 6 周、30 小时、3 检查点，Request Logs 记录 `POST /api/v1/learning/roadmap` HTTP 200。先前清理 Profile 后对旧草稿重算得到 404，属已删除 Profile 的预期结果，不计为成功样本。 |
| 16. Proxy / Authentication / WAF | **BLOCKED** | 代码固定 Backend Preview HTTPS 别名、路径/方法/查询白名单、64 KiB 请求体、1 MiB 响应、15 秒上游超时、同源 POST Origin、`synthetic_input=true`；Bypass Secret 只在 server Function 请求头使用。Frontend 与 Backend Preview 的 Vercel Authentication 均为 Enabled，匿名访问均被 302 SSO 拦截。Frontend WAF 中存在 `preview-api-rate-limit`：POST `/api/v1/`、每 IP 60 秒 10 次、429；但其 Hostname 只覆盖分支别名和旧唯一部署别名，未覆盖新唯一部署别名，且 View Traffic 页面返回 404，**无法确认 WAF 实际命中**。实例内 Map 限流不能代替分布式 WAF。按安全门槛标记 BLOCKED。 |
| 17. Frontend Real API | PASS | `VITE_API_MODE` Preview 变量存在；浏览器代码的 API 根路径固定为相对 `/api/v1`。新 Preview 的 health、roles、Normalize、Confirm、Recommendation、Skill Map、Roadmap 经 Frontend 同源路径返回；Request Logs 显示 200，无跨域 OPTIONS 流程。`VITE_API_BASE_URL` 仍存在于 Frontend Preview 变量清单，代码已不读取；建议从 Preview 配置移除，以免未来代码误用。 |
| 18. MiniMax Mock Test | PASS | 后端全套测试含 TokenHub `MockTransport`、表单无自由文本时不调用 TokenHub、Adapter 装载与错误处理；本轮只走空白自由文本的规则 Adapter 流程，未配置或使用付费调用。 |
| 19. MiniMax Live | **NOT VERIFIED** | 本轮未调用 TokenHub / MiniMax，没有消耗 API Credit，不声称 MiniMax Cloud E2E 通过。 |
| 20. Production 未修改证据 | PASS | 推送只到 `integration/postgres-preview-backend`。Vercel Dashboard 显示 Frontend 与 Backend Production Source SHA 仍为 `0e8bffd`（main / PR #14），Production Frontend 仍为 V1.2；未改 Production Variables、域名或数据库。 |
| 21. 剩余 Blockers | **BLOCKED** | WAF 规则未覆盖新唯一别名且命中不可证；Cloud 过期 Revision 409、Profile GET 跨请求读回、各 POST 的 Response Request ID / `model_version` 未直接抓取；Backend Preview `DATABASE_URL` 是否 pooled TLS、`AI_ADAPTER_MODULE` 的实际值及 Python runtime/build/runtime logs 未完整核验。 |
| 22. 是否建议合并 | **BLOCKED** | 暂不合并 #13。先完成 WAF 与部署配置核验，再对同一最终 SHA 补齐 Cloud 409、Profile GET、响应元数据证据。 |

## 本轮 Cloud 请求证据

下表来自 Source SHA `4bebeea` 的 Frontend Preview Request Logs 与受保护浏览器页面。`—` 表示**未截取**，不是后端未返回。Request ID 仅从直接打开的同源 GET JSON 读取；没有把密钥、请求正文或连接串写入日志或本文档。

| Endpoint | Cloud HTTP | Request ID | Deployment SHA | Response `model_version` | 结果 |
| --- | --- | --- | --- | --- | --- |
| `GET /api/v1/health` | 200 | `req_df3f585864df40ce8cd2997f6b529fc7` | `4bebeea` | `rules-v0.1` | PASS |
| `GET /api/v1/trends/roles?region=MY&limit=50` | 200 | `req_6228d28941df476bbe4cbe1d914b4497` | `4bebeea` | `rules-v0.1` | PASS |
| `POST /api/v1/profiles/normalize` | 200 | — | `4bebeea` | — | PASS，Profile ID 在 Neon 得到确认 |
| `POST /api/v1/profiles/confirm` | 200 | — | `4bebeea` | — | PASS，Neon Revision 2 |
| `POST /api/v1/recommendations`（Moderate / Fast） | 200 | — | `4bebeea` | `tech-v1` 仅代码/本地验证；Cloud 值 — | PASS 功能，元数据 NOT VERIFIED |
| `POST /api/v1/learning/skill-map` | 200 | — | `4bebeea` | — | PASS |
| `POST /api/v1/learning/roadmap` | 200 | — | `4bebeea` | — | PASS（重新计算的新 Profile） |
| `GET /api/v1/profiles/{id}`（跨新 HTTP 请求） | —；前端代理有意不开放此路径 | — | — | — | NOT VERIFIED（Cloud）；Neon 实库集成测试 PASS |
| 过期 `profile_revision` Confirm | — | — | — | — | NOT VERIFIED（Cloud）；Neon 实库并发 200/409 测试 PASS |

已清理本轮 Cloud E2E 创建的全部三条合成 Profile；对最终两条 Profile ID 的查询结果为 0。未删除其他业务数据。

## 代码审查与本轮测试

- 后端 Preview 在 `PROFILE_STORE != postgres` 或缺少 `DATABASE_URL` 时启动失败；PostgreSQL 连接或 schema 错误不会回退 SQLite。连接池上限为每实例 3，池等待与数据库连接超时均为 5 秒；在 Vercel 上要求 `sslmode=require` 或更强。`body` 用 JSONB，Revision CAS 为原子 SQL。Production 未设置这条 Preview 保护条件。
- `vercel.json` 使用 `/api/v1/:proxy_path*` 到 `/api/proxy`。Vercel 会将未在目标中消耗的命名捕获加入查询；代理只消费一个 `proxy_path`、不向 Backend 转发，并拒绝未知用户查询。旧版同时产生 `path` 与 `proxy_path` 导致 `BAD_QUERY` 的行为有回归测试。任意目标 URL、任意 API 路径和浏览器直连 Backend 均不可用。
- `pnpm install --frozen-lockfile`：PASS；`pnpm test`：48/48 PASS；`VITE_API_MODE=real pnpm build`：PASS；独立代理测试：5/5 PASS。
- 后端依赖用 `uv pip install --python /private/tmp/syncera-proxy-test/bin/python -r backend/requirements-dev.txt` 安装（该 venv 没有 `pip` 模块）；`backend` 中 `python -m pytest tests -q`：84 PASS、1 SKIPPED（当时没有向该套测试注入 Neon URL）；单独运行 `tests/test_tencent_tokenhub_adapter.py`：10/10 PASS，全部为非付费测试；`uv pip check`：PASS，33 个包兼容。
- 随后仅对确认身份的 Neon Preview DB 注入临时 Direct Connection，执行 `tests/test_postgres_integration.py::test_persistent_http_flow_and_atomic_revision`：1 PASS，验证迁移幂等、多连接持久化、Normalize/Confirm、并发 200/409、Moderate/Fast、Skill Map/Roadmap；测试自行清理记录。连接串未进入命令行、文件、输出或 GitHub。
- 启动本地 Uvicorn 后运行 `tests/cross-stack.test.ts`：1/1 PASS；`git diff --check` 与本地构建资产的敏感变量名搜索：PASS。已停止本地服务。

## 发布前需要补齐的 Preview 设置与复验

1. 在 **Frontend Preview** 的 Vercel WAF 将规则覆盖所有目标 Preview Hostname（至少分支别名与当前唯一部署别名，或按 Vercel 支持的 Preview Environment 条件收口）。用受保护的测试账户发出受控超过阈值的虚构 POST，确认实际 429 和 WAF Traffic 命中，再恢复正常流量。保留 Frontend/Backend 的 Vercel Authentication，不增加匿名例外。
2. 在 **Frontend Preview** 仅保留服务器端 `BACKEND_PROTECTION_BYPASS_SECRET`、`BACKEND_PREVIEW_ORIGIN` 与构建开关 `VITE_API_MODE=real`；删除无用的 `VITE_API_BASE_URL` Preview 配置。绝不把 Bypass 值放进 `VITE_*`、URL、浏览器或 GitHub。Preview 重新部署后再次检查匿名 Frontend/Backend API 被 SSO 拦截。
3. 在 **Backend Preview** 核对 `PROFILE_STORE=postgres`、`DATABASE_URL` 为 **Neon Preview pooled TLS**、`AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter`、`MAX_CV_UPLOAD_BYTES=3145728`、`ENABLE_SYNTHETIC_UPLOAD=0`、`FRONTEND_ORIGINS` 为精确 HTTPS Origin。Dashboard 当前只确认前四个已列出的变量名中的 `PROFILE_STORE`、`DATABASE_URL`、`AI_ADAPTER_MODULE`、`FRONTEND_ORIGINS`；值因隐藏未核验，后两个变量名未在分支作用域清单中出现。代码对 Vercel 上传仍有 3 MiB 上限且上传路由默认关闭，但运维配置需与发布单一致。不要修改 Production Variables。
4. 对最终部署 SHA，在授权浏览器/安全诊断工具中记录每个响应的 HTTP、`meta.request_id` 与 `meta.model_version`；用仅本轮虚构 Profile 验证过期 Revision 为 409、由新的 Backend HTTP 请求读回同一 Profile、Moderate/Fast、Skill Map/Roadmap。完成后仅按 Profile ID 和合成标记精确清理测试记录。检查 Backend Runtime Logs 及 Frontend Function Logs 不含敏感头或正文；确认 Python runtime 和 Preview Source SHA。

上述项目完成之前，整体保持 **PARTIALLY WORKING**，安全验收为 **BLOCKED**。

## Final Acceptance（2026-10-22 23:02 UTC+08）

本节 Cloud 流程复验的是代码提交 `276f95fa33808adedc939f0f426d21a6c57adfe7` 的受保护 Preview。报告提交 `41725c26401998cb21c5bb10e8721178132d6171` 后，目标分支由并行工作推进到 `f06d0b70ed3ae1af84d1a2acb9195ae2cea236f4`，增加可选 Career Analysis；不能把旧 Cloud 结果自动归给新 SHA。2026-10-23 只读 Git 远端核对确认该分支仍指向 `f06d0b7`；Vercel 部署列表未加载完成，最终部署状态没有完成复验。所有已执行的线上写入均为虚构结构化资料，未发送真实 CV，也未发起收费 MiniMax 请求。

| # | 验收项 | 状态 | 本轮证据与边界 |
| --- | --- | --- | --- |
| 1 | Latest PR #13 SHA | PASS | 本地目标分支和 `origin/integration/postgres-preview-backend` 跟踪引用均指向 `f06d0b70ed3ae1af84d1a2acb9195ae2cea236f4`，独立 `git ls-remote` 亦确认该远端 SHA；`origin/main` 为 `0e8bffdb549a146f37d57a7946cef702eb1b891d`。此为本报告修订提交前的分支 HEAD。 |
| 2 | Frontend Preview SHA | NOT VERIFIED | 已验收的 Ready 部署 `akvPeqfCTwBR1bVnCfSTHxBncFTr` 运行旧代码 `276f95f`；`41725c2` 的新部署曾进入 Building，`f06d0b7` 对应部署未核验。 |
| 3 | Backend Preview SHA | NOT VERIFIED | 已验收的 Ready 部署 `EhRmcmYFh5ZqmUyQK9o7axFeuHCa` 运行旧代码 `276f95f`；`f06d0b7` 对应部署未核验。 |
| 4 | Actual Preview URLs | NOT VERIFIED | Frontend 分支别名 `https://syncera-frontend-git-integration-postgres-pr-e72229-frank219wan.vercel.app`、旧唯一别名 `https://syncera-frontend-jllrtc28c-frank219wan.vercel.app`；Backend 分支别名 `https://syncera-backend-git-integration-postgres-pre-a79754-frank219wan.vercel.app`、旧唯一别名 `https://syncera-backend-ahqbpj1lk-frank219wan.vercel.app`。新 SHA 的唯一别名和归属仍需核验。 |
| 5 | WAF Rule Coverage | BLOCKED | Frontend 规则 `preview-api-rate-limit`（ID `rule_preview_api_rate_limit_c6P0Pw`）现有生效版仅列三个旧 Hostname，不含后续唯一部署别名。已将条件暂存为 Environment=Preview、POST、Request Path starts with `/api/v1/`、每 IP 固定 60 秒 10 次、动作 429；Dashboard 显示 `Review Changes 1`，**尚未发布或验证生效**。按 Vercel Firewall 技能的发布门槛，需用户审阅并亲自 Publish。 |
| 6 | WAF 429 Event Evidence | NOT VERIFIED | 在受保护分支别名上小规模重试过期 Confirm（无有价值写入、无付费模型调用），仅确认多个 HTTP 409；Firewall Traffic 最近一天显示 `Rate Limited -` 和 `There are no enforced rules`，规则详情的 `View Traffic` 返回 404。没有可核验的 WAF 429、Rule ID + Hostname + 时间戳 + Request ID 事件；不能把代理内存限流视作 WAF 命中。 |
| 7 | Cloud Stale Revision 409 | PASS | 同一虚构 Profile 确认后 revision 2；两个独立已加载的确认页以相同旧状态操作，第一个提交使 revision 到 3，第二个页面显示 `Profile revision changed`。Frontend Request Logs 于 `2026-10-22T14:55:17.624Z` 显示 POST `/api/v1/profiles/confirm` 409，Backend Request Logs 同路径 409；Frontend Vercel Request ID `dwt8m-1792680917624-24181cd62ce6`。响应 JSON 的实际 `error.code` 和 `meta.request_id` 未截取，**这两项仍为 NOT VERIFIED**；代码契约预期 `SNAPSHOT_CONFLICT`，不能冒充线上读取值。 |
| 8 | Cross-request Persistence | PASS | 独立 HTTP Normalize、Confirm、Fast/Moderate Recommendation、Skill Map 与 Roadmap 均通过 Frontend 同源代理到受保护 Backend。后续请求使用已确认 Profile 得到不同情境的推荐；Neon 独立查询同一 Profile。未安排跨 Vercel 实例的冷启动读取，故跨实例一项 NOT VERIFIED。 |
| 9 | Neon Revision Verification | PASS | Neon Preview `aged-surf-56749653` / `br-falling-glade-aox9nfes` / `syncera_preview` 的独立查询：本轮 `profile_44909bc7758444d2` 的 `current_occupation` 为虚构标记，Normalize 后 revision 1、首次 Confirm 后 2、再次正常 Confirm 后 3；过期提交后仍为 3。仅以 Profile ID、revision 和虚构标记精确删除，随后 `count(*)=0`。 |
| 10 | POST Response Metadata | NOT VERIFIED | Frontend/Backend Request Logs 证实各实际 POST 状态，但浏览器诊断没有截取各响应 JSON；`meta.request_id`、`meta.model_version`、适用的 `meta.snapshot_id` 和代理保真性不能逐条验收。UI 显示 snapshot `snap_my_20261021_01`；代码中的推荐评分版本为 `tech-v1`，不能称为已读取 Cloud 响应。 |
| 11 | Backend Runtime Error Logs | PASS | 最终 Backend 部署 Request Logs 中本轮 Normalize、Confirm、Recommendation、Skill Map 均为 200，过期 Confirm 为 409；最近 30 分钟控制台 Warning/Error/Fatal 计数均为 0。该窗口未出现 503 或异常堆栈；旧 503 的原始完整异常仍不可恢复，连接失效仍是有依据的推断而非已完全证明的根因。Vercel Python runtime 版本未从部署设置单独确认。 |
| 12 | Pool Recovery Regression Tests | PASS | `ConnectionPool.check_connection`、仅连接级异常一次重试、同一 Profile ID、已提交响应丢失时核对行内容均保留。恢复与 PostgreSQL 测试合跑：13 PASS、1 SKIPPED（未注入实库 URL）；单独向 Neon Preview 临时无回显注入连接运行 `test_postgres_integration.py`：10 PASS，包含实库连接恢复与 CAS。 |
| 13 | Frontend / Proxy Tests | PASS | 旧 SHA：48 PASS、build PASS、跨栈 1 PASS。新 `f06d0b7` 隔离检出：直接执行 `package.json` 的 Node test 命令 49 PASS；`tsc -b && vite build` PASS；`git diff --check` PASS。`pnpm` 包装器因离线安装检查与隔离检出的依赖软链保护而未能运行，但等价脚本已直接通过。 |
| 14 | Backend Tests | PASS | 旧 SHA：88 PASS、1 SKIPPED，Neon 实库另跑 10 PASS，`uv pip check` 兼容。新 `f06d0b7` 隔离检出：`python -m pytest tests -q` 99 PASS、1 SKIPPED（未注入 `TEST_DATABASE_URL`）；新 SHA 的 Neon 实库集成尚未重跑。 |
| 15 | Preview Environment Security | NOT VERIFIED | Frontend 与 Backend Dashboard 的 Vercel Authentication 均为 Enabled / Standard Protection；匿名无凭据访问两端 Health 均为 302。Frontend 分支 Preview 存在服务器端 Secret 名 `BACKEND_PROTECTION_BYPASS_SECRET`，浏览器代码仅用同源 `/api/v1`；代理固定 Backend HTTPS 域、路径/方法/查询白名单、64 KiB 请求体、限流。Backend Preview 列出 `PROFILE_STORE`、`DATABASE_URL`、`AI_ADAPTER_MODULE`、`FRONTEND_ORIGINS`，但隐藏值需邮件验证码，未揭示或核对 pooled/TLS 实际 URI、Adapter 实际值及精确 Origin；`MAX_CV_UPLOAD_BYTES`、`ENABLE_SYNTHETIC_UPLOAD` 未见分支变量。Frontend 仍有无用 `VITE_API_BASE_URL` Preview 配置，建议受控移除后复验。 |
| 16 | Production Unchanged | PASS | 本轮未修改 main、Production Vercel、公开 Backend 域名、Neon Production 或任何密钥；只写入并精确清理 Neon Preview 的本轮虚构 Profile。 |
| 17 | MiniMax Live | NOT VERIFIED | 本轮没有真实 TokenHub / MiniMax 请求。Normalize 使用无 CV/经验全文的虚构表单；推荐版本 `tech-v1` 是确定性评分，不代表 MiniMax。数据库内部重试不重复抽取；用户重新发起整个 Normalize HTTP 请求仍可能重复付费，后续需请求级幂等。 |
| 18 | Outstanding Release Risks | BLOCKED | WAF 稳定 Preview 条件仅暂存、无 WAF 429 事件；新 `f06d0b7` 部署及 Cloud 全流程未复验，Career Analysis 的 Preview 开关实际值未核对，不能触发可能付费的路径；各 POST 的 Cloud 响应元数据与 CAS 实际错误码未截取；隐藏 Preview 变量值及 Vercel Python runtime 未核对；跨实例读取未执行；Frontend 仍有旧 `VITE_API_BASE_URL`。 |
| 19 | Final Merge Recommendation | BLOCKED | **暂不合并 Draft PR #13。** 旧 SHA 的功能流程与 Cloud 409 有证据；新 SHA 部署、WAF 发布及真实 429、逐条响应元数据等最终安全门槛尚未通过。 |

### 最终 Preview HTTP 记录

| 同源 Endpoint | Frontend HTTP | Backend HTTP | 页面/独立数据库证据 | Cloud `meta.request_id` / `model_version` |
| --- | --- | --- | --- | --- |
| `GET /api/v1/health` | 200 | 200 | JSON `status=ok`；`request_id=req_ab95df63cde7438795e544b5ed520426`、`model_version=rules-v0.1` | PASS（仅 GET） |
| `POST /api/v1/profiles/normalize` | 200 | 200 | `2026-10-22T14:53:02Z`；Neon Profile revision 1 | NOT VERIFIED |
| `POST /api/v1/profiles/confirm` | 200 | 200 | `2026-10-22T14:53:42Z`；Neon revision 2 | NOT VERIFIED |
| `POST /api/v1/recommendations` Fast | 200 | 200 | UI Data Analyst 相对匹配分 32.87 | NOT VERIFIED |
| `POST /api/v1/recommendations` Moderate | 200 | 200 | UI Data Analyst 相对匹配分 31.62 | NOT VERIFIED |
| `POST /api/v1/learning/skill-map` | 200 | 200 | `2026-10-22T14:54:13Z`；SQL 依赖路径出现 | NOT VERIFIED |
| `POST /api/v1/learning/roadmap` | 200 | NOT VERIFIED | `2026-10-22T15:00:17Z` Frontend Request Logs；重新计算完成 | NOT VERIFIED |
| `POST /api/v1/profiles/confirm`（过期） | 409 | 409 | `2026-10-22T14:55:17Z`；Neon revision 保持 3 | NOT VERIFIED（响应错误码与 `meta`） |

上表 Vercel Request ID 是边缘日志标识，**不是**响应中的 `meta.request_id`；两者不可混用。没有把请求正文、连接串或任何密钥写入报告。最终验收结论：**BLOCKED / READY TO MERGE: NO**。

## Final Acceptance Refresh（2026-10-23 UTC+08）

本节覆盖代码及此前报告提交 `cb48b33dc527acb39ed3bef64d2945861160152c`。两端 Vercel Preview 均在该 Source SHA 的 Ready 部署上验收：Frontend `8dPz7Hk687BUZJzUQ1AC6f6YbE8K`（唯一别名 `https://syncera-frontend-ax4px35mu-frank219wan.vercel.app`），Backend `32dMLGkuFLXUCXsJFLtduUQsTkaD`（唯一别名 `https://syncera-backend-9syem65xo-frank219wan.vercel.app`）。GitHub 对该 SHA 的两项 Vercel 状态均为 success。本节更新前文中旧 SHA 未验收的记录；最终报告提交会产生另一个仅文档 SHA，需对它做部署 Ready 与 Health 冒烟复核。

| # | 验收项 | 状态 | 最新证据与边界 |
| --- | --- | --- | --- |
| 1 | Cloud 基线 PR #13 SHA | PASS | Cloud 全流程验收对应已推送的 `cb48b33dc527acb39ed3bef64d2945861160152c`；分支随后有并行提交，见下节。 |
| 2 | Frontend Preview SHA | PASS | Preview 部署 `8dPz7Hk687BUZJzUQ1AC6f6YbE8K` Ready，Source `cb48b33`，唯一别名如上。 |
| 3 | Backend Preview SHA | PASS | Preview 部署 `32dMLGkuFLXUCXsJFLtduUQsTkaD` Ready，Source `cb48b33`，唯一别名如上。 |
| 4 | Actual Preview URLs | PASS | 两端唯一别名及既有分支别名均已核对；下述 Cloud E2E 使用 Frontend 唯一别名。 |
| 5 | WAF Rule Coverage | BLOCKED | Frontend 规则 `preview-api-rate-limit` 已暂存 Environment=Preview、POST、`/api/v1/` 前缀、每 IP 60 秒 10 次、429；Dashboard 仍显示 `Review Changes 1`，尚未发布。当前生效规则的旧 Hostname 集合不覆盖新的唯一别名。 |
| 6 | WAF 429 Event Evidence | NOT VERIFIED | 没有 Rule ID、Hostname、时间戳、Request ID 组成的真实 WAF 429 事件。代理实例内限流不能替代此证据；规则须由用户审阅发布后再受控验证。 |
| 7 | Cloud Stale Revision 409 | PASS | 两个预先加载的确认页面使用同一虚构 Profile。第一个 Confirm 使 Revision 2→3；第二个旧页面显示 `Profile revision changed`。Frontend 部署日志 `2026-10-23 01:13:15.27 UTC+08` 记录 `POST /api/v1/profiles/confirm` HTTP 409；Neon 查询 Revision 仍为 3。响应 JSON 的 `error.code` 与 `meta.request_id` 未截取。 |
| 8 | Cross-request Persistence | PASS | 独立的 Normalize、Confirm、Recommendation、Roadmap、Skill Map HTTP 请求均经 Frontend 同源代理成功；Neon 独立查询读到相同虚构 Profile、Revision 2 后又读到 3。未做跨 Vercel 实例冷启动读回。 |
| 9 | Neon Revision Verification | PASS | Preview Project `aged-surf-56749653`、Branch `br-falling-glade-aox9nfes`、DB `syncera_preview` 中 `profile_0e6acee914f14506` 的虚构标记匹配且 `reviewed_by_user=true`。获用户单独确认后仅以 Profile ID、Revision 3、虚构标记三重条件精确删除；`RETURNING` 一行，复查 `count(*)=0`。 |
| 10 | POST Response Metadata | NOT VERIFIED | Frontend Vercel Request Logs 给出各 POST 的 HTTP 状态；各响应 JSON 的 `meta.request_id`、`meta.model_version` 与适用的 `meta.snapshot_id` 未直接截取，不能声称逐项通过。 |
| 11 | Backend Runtime Error Logs | NOT VERIFIED | 新 SHA 的 Frontend 代理日志显示 Normalize/Confirm 等 200、过期 Confirm 409；本轮没有完整复核 Backend 新部署的 Warning/Error/Fatal 窗口和 Python runtime。旧 503 的完整原始堆栈仍不可恢复。 |
| 12 | Pool Recovery Regression Tests | PASS | 新 SHA 后端全集 `99 PASS, 1 SKIPPED`，保留失效连接恢复、单次有界重试和 CAS 回归测试；`TEST_DATABASE_URL` 未注入，因此本 SHA 实库集成测试未重跑。旧 SHA Neon 实库 10 PASS。 |
| 13 | Frontend / Proxy Tests | PASS | 新 SHA `package.json` 对应 Node 测试直接运行 `49 PASS`；`tsc -b && vite build` PASS。`pnpm` 包装器因离线 registry/隔离检出软链保护未成功，但等价脚本执行通过。构建资产敏感变量名搜索无命中。 |
| 14 | Backend Tests | PASS | 新 SHA `python -m pytest tests -q`：`99 PASS, 1 SKIPPED`（缺 `TEST_DATABASE_URL`）。不把跳过项称为实库通过。 |
| 15 | Preview Environment Security | NOT VERIFIED | 两端匿名 Health 均返回 Vercel Authentication 302，已登录 Safari 经 Frontend/Backend Health 各得 200；Frontend 浏览器只走同源 `/api/v1`。Frontend server Function 使用 Secret 名 `BACKEND_PROTECTION_BYPASS_SECRET`，本地打包搜索无密钥变量名。Backend Preview 列出 `PROFILE_STORE`、Secret `DATABASE_URL`、`AI_ADAPTER_MODULE`、`FRONTEND_ORIGINS`；隐藏值与连接串 pooled/TLS、精确 Origin 仍未核验。 |
| 16 | Production Unchanged | PASS | 只推送目标集成分支并写入/精确清理 Preview Neon 虚构记录；未修改 main、Production、公开 Backend 域名或任何密钥。 |
| 17 | MiniMax Live | NOT VERIFIED | 结构化虚构资料的经验自由文本留空，未走付费抽取；Preview 未设置 `ENABLE_LIVE_CAREER_RECOMMENDATION`，页面 Moderate/Fast 显示规则推荐和 `disabled`。未调用真实 MiniMax。 |
| 18 | Outstanding Release Risks | BLOCKED | WAF Preview 条件只暂存，未覆盖新唯一别名且无实际 429；POST 响应元数据、Backend 新部署日志、隐藏 Preview 变量值、跨实例读取及新 SHA 的 Neon 实库测试仍未验收。 |
| 19 | Final Merge Recommendation | BLOCKED | **暂不合并 Draft PR #13。** 功能主链在 `cb48b33` 的受保护 Preview 成功，Cloud 409 与独立 Neon 持久化已证实；WAF 门槛仍未满足。 |

### `cb48b33` Cloud 请求与清理证据

| 同源 Endpoint | Frontend HTTP | 直接观察结果 |
| --- | --- | --- |
| `GET /api/v1/health` | 200 | Frontend `request_id=req_a143…`、Backend `request_id=req_ef0…`，两端 `status=ok`、`model_version=rules-v0.1`；完整 ID 未写入本节。 |
| `POST /api/v1/profiles/normalize` | 200 | `2026-10-23 00:16:39.52 UTC+08`，Neon 产生上述虚构 Profile。 |
| `POST /api/v1/profiles/confirm` | 200 | `00:16:57.71`；Neon Revision 2、`reviewed_by_user=true`。 |
| `POST /api/v1/recommendations` Moderate / Fast | 200 | `00:17:00.31`、`00:17:05.80`、`00:17:12.25`；UI 展示 Data Analyst 35.62 / 36.87，规则路径 `disabled`。 |
| `POST /api/v1/learning/roadmap` | 200 | `00:17:25.84`、`00:17:32.97`；UI 展示 3 技能检查点、预计 30 小时。 |
| `POST /api/v1/learning/skill-map` | 200 | `00:17:38.58`；UI 展示 SQL 10 小时。 |
| `POST /api/v1/profiles/confirm`（新 Revision） | 200 | `2026-10-23 01:12:35.13 UTC+08`；Neon Revision 3。 |
| `POST /api/v1/profiles/confirm`（旧 Revision） | 409 | `2026-10-23 01:13:15.27 UTC+08`；UI 冲突提示、Neon Revision 保持 3。 |

本轮唯一虚构 Profile 已在用户确认后精确清理，查询剩余 0 行。没有把请求正文、数据库连接串、Bypass Secret 或 TokenHub Key 写入本文档。**整体：PARTIALLY WORKING；READY TO MERGE: NO。**

### 并行更新后的最新分支（2026-10-23 UTC+08）

推送本节报告之前，`integration/postgres-preview-backend` 被并行工作推进到 `50a2dc940f0079c2b93391a97520917af51c3e91`，新增受控虚构 CV 上传路径并修改 `server/proxy.ts`、`vercel.json`、`src/` 与测试。`main` 也由其他工作推进至 `433bc2e5127145541061ed6bc4a33f13039cbde9`；本报告没有修改 main。报告已基于最新目标分支重放，无覆盖或强推。GitHub 对 `50a2dc9` 的两项 Vercel Preview 状态均为 success：Frontend 部署 `nkV8a3fusbgidBqSxCkmUNeVsU6y`，Backend 部署 `6bPMriQ34Kkm1u4sM2CkNHbjb1mm`。两端分支别名的匿名 Health 均仍返回 Vercel SSO 302。

针对 `50a2dc9` 重新运行前端测试 **55 PASS**、后端 **101 PASS / 1 SKIPPED**（无 `TEST_DATABASE_URL`）、`tsc -b && vite build` **PASS**，浏览器构建资产中未找到 `BACKEND_PROTECTION_BYPASS_SECRET`、`TENCENT_TOKENHUB_API_KEY` 或 `DATABASE_URL` 字符串。因新提交改动了代理，`cb48b33` 的 Normalize→Confirm→Recommendation、CAS 409 等 Cloud 请求不能自动归到 `50a2dc9` 或随后的报告提交。**最新 SHA 的已登录 Cloud E2E 仍为 NOT VERIFIED**；也未触发新 CV 上传的可能付费提取路径。WAF 暂存规则仍待用户审阅发布并记录真实 429。**READY TO MERGE: NO。**
