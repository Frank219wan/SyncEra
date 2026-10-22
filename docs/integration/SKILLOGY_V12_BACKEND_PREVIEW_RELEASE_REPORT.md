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
