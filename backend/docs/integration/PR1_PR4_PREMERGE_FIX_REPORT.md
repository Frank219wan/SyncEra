# PR #1 / PR #4 合并前 P1 修复报告

日期：2026-10-21（MYT）。本报告记录**本地未提交**的修复。PR #1 的独立工作树为 `/Users/wansiyu/Desktop/SDC 黑客松2026/SyncEra-backend-pr1-fixes`，分支 `feature/backend-integration`；叠加 PR #4 的工作树为 `/Users/wansiyu/Desktop/SDC 黑客松2026/SyncEra-backend-integration`，分支 `feature/backend-ai-integration`。开始时均与对应 `origin` head 一致，后续没有 commit、push、merge、rebase 或部署。原审查报告 `PR1_PR4_PREMERGE_CODE_REVIEW.md` 保留为未跟踪文件。

## 1. 修复前复现

从 `origin/feature/backend-ai-integration` 的 **`f1ad6da`** 用 `git archive` 解出临时副本，调用旧版 FastAPI 和旧导入器，得到：

| 漏洞 | 旧版实际输出 | 修复后证明 |
|---|---|---|
| F-01：零技能虚高推荐 | 首次确认 200；虚假 Adapter 推荐 **HTTP 200、100 分、0 个缺口** | `tests/test_premerge_fixes.py` 的零技能、漏缺口、错等级、假强项、篡改 outlook/Evidence/情景说明均为 HTTP **502 / MODEL_INVALID_OUTPUT**；合法 Demo 与 Tech 输出仍 200 |
| F-02：缺省 revision 覆盖 | 两次不带 revision 的确认均 **200**，revision 进入 **3** | 首次可省略；已确认后省略为 **409 / PROFILE_REVISION_REQUIRED**；旧版本为 409；正确版本 200；双并发 CAS 仅一个成功 |
| F-04：无依据 coverage | 候选 `skill_sql.observed_metrics.coverage=1.0` | 改为 `null`；隔离导入与 HTTP Trends Skills 均返回 null |
| F-05：编辑审批人文本 | 只把预检 `reviewed_by` 改成 `unverified-reviewer`，候选 Snapshot 变成 **`public_open/is_mock=False`**，一条资源被接受 | 相同候选 ID 在正常导入和启动装载均拒绝；仅显式隔离预检可加载，仍为 `mixed_demo/is_mock=True` |

原版上传的体积检查位于 `UploadFile` 参数解析之后，见原审查报告 F-03；这是框架调用顺序的静态证据，未运行恶意大文件攻击。

## 2. PR #1：最小代码修复

| 项目 | 本地文件与行号 | 实现与对应测试 |
|---|---|---|
| 独立推荐校验 | `app/scoring_validation.py:11-120`；`app/services.py:125-129`；`app/main.py:160-179` | 服务端依据**已确认 Profile、可信 Role Catalogue/Required Skills、目标等级、选定 Trend Snapshot、场景倍率**重新计算四个分量与总分、完整缺口/等级/强项、角色/证据/SDG、排序和情景说明。支持显式 `demo-v1` 与 `tech-v1`，不调用 Adapter 自身代码复算。未知策略或失配返回通用 502，不把内部异常发送给客户端。`test_premerge_fixes.py` 含 8 组篡改、合法 Demo；组合测试含合法 Tech、Moderate/Fast 可复算。 |
| Revision CAS | `app/services.py:87-101`；原有 `app/storage.py` 条件 SQL 未改 | 首次确认保留可省略版本的兼容行为。已确认画像再次修改必须给 `profile_revision`；缺失 409 `PROFILE_REVISION_REQUIRED`，过期 409 `SNAPSHOT_CONFLICT`。数据库仍执行按旧 revision 条件更新。测试覆盖首次、缺失、过期、正确、两个并发冲突。历史 Revision 未重写。 |
| Multipart 前置总量限制 | `app/upload_guard.py:1-69`；`app/main.py:37,129-157` | 仅拦截 `POST /api/v1/profiles/upload`。总请求上限 = `MAX_CV_UPLOAD_BYTES`（默认 10 MiB 文件上限）+ 256 KiB multipart 开销。声明的 `Content-Length` 超限在读 body 前 413；重复/非数字长度 400；缺失或谎报长度时按 ASGI `http.request` 实际字节数计数，超过阈值的 chunk **不会送给 Starlette multipart 解析器**。保留原 PDF/DOCX 扩展名、格式、ZIP/PDF、文本长度和文件本身大小检查。直接 ASGI 流测试及实际 TestClient multipart 路由测试通过；其他路由不受该 guard 影响。 |
| 契约说明 | `contracts/PROFILE_CONFIRM_AND_SCORING_ADDENDUM.md`；`README.md` | 记录 409 行为、双评分策略和文件上限与整请求上限的区别。冻结的 v1.0 公共 API schema 未改。 |

**限制：** 这个 ASGI guard 解决进入 multipart parser 前的**请求体积**，不能提供上传速率、连接数、磁盘配额或 PDF/DOCX 单次解析调用的硬时限。`cv_upload.py` 的超时检查不能中断一个卡住的解析函数。公开 Replit 上传前仍需在可信入口设置请求体积/速率/并发限制，并用受资源和时间限制的隔离进程处理文档解析，验证临时文件与 SQLite 留存政策。本轮没有远程 Replit 验证，也不授权真实个人 CV。

## 3. PR #4：候选数据与审批边界

| 项目 | 本地文件与行号 | 验证与界限 |
|---|---|---|
| SQL coverage | `tech_delivery/snapshot_dosm_mycol_my_2026q2_v1.json:55-60`；`tests/test_futureproof_ai_delivery.py:94-108,168-180` | `coverage=null` 通过 Pydantic 导入与 HTTP 返回。DOSM `valid_postings=3053`、表内 46.50、SQL taxonomy 70、Moderate/Fast 1.00/1.05 未改；没有补造分子/分母。前端不得把 null 当成 100%。 |
| 固定候选 ID 禁止就地升级 | `app/approved_data.py:25-29,159-170,267-275`；`tests/test_futureproof_ai_delivery.py:141-165` | 正常导入、CLI 和启动装载拒绝**已知候选快照与资源 ID**，即使作者自填 `reviewed_by`；显式内存预检仍只能返回 mixed/mock。正常应用不会自动启用候选 `public_open`。 |
| 交接/审批 | `tech_delivery/INTEGRATION.md`、`tech_delivery/SOURCE_METHOD.md`、`AI_BACKEND_HANDOFF.md`、`README.md` | 删除“改 reviewer 字符串后启用同一候选 ID”的旧指引；要求 Team Lead 复核原文、数值、映射、资源条款，发布**新不可变 ID**，并由独立控制的受保护审批/发布权限维护 manifest、`data/approved` 与 `ACTIVE_SNAPSHOT_ID`。 |

**审批安全边界：** 文本中的 `reviewed_by` 和时间戳本身**不具身份验证能力**。已知候选 ID 的默认拒绝只防止这批交付被直接伪装；对一个新 ID，导入器仍只检查 schema、URL、时间和对应关系，不能证明真人审核。Team Lead 必须配置受保护分支/审批人及部署写权限，保留可追溯的人工审核记录，才能将新包设为 `public_open`。当前所有候选数据及 Microsoft Learn 资源仍 **DATA APPROVAL PENDING**，没有伪造审批结论或启用正式数据。

## 4. 实际回归结果

| 环境与命令 | 结果 |
|---|---|
| 共用 Python 3.12 venv：`backend/.venv/bin/python -m pip check` | `No broken requirements found`；仅 pip cache 权限提示。 |
| PR #1 独立工作树 `backend/`：`PYTHONDONTWRITEBYTECODE=1 DATABASE_PATH=/private/tmp/futureproof_pr1_fix_runtime.sqlite <venv-python> -m pytest tests -q -p no:cacheprovider` | **47 passed / 0 failed / 0 skipped**；6 项第三方弃用 warning。 |
| PR #1 + PR #4 工作树 `backend/`：同参数、独立临时 SQLite，`.venv/bin/python -m pytest tests -q -p no:cacheprovider` | **55 passed / 0 failed / 0 skipped**；6 项第三方弃用 warning。含旧 CV PDF/DOCX、Normalize/Confirm、CAS、独立评分、Tech adapter、候选 Snapshot/Resource、Evidence ID、Moderate/Fast、Skill Map/Roadmap、OpenAPI 与 P1 503。 |
| 两套代码实际 Uvicorn `127.0.0.1`；GET `/api/v1/health`、`/docs`、`/openapi.json` | 两套均 **200 / 200 / 200**；Runtime OpenAPI 各含 **16** 个 `/api/v1` 路径。PR #4 使用 `AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter`。 |
| `git diff --check`，PR #4 本次修改/新增文件模式扫描，`.gitignore` 检查 | 两树均无空白错误；修改/新增文件未命中常见密钥或私钥模式，未发现 `.env`、数据库、PDF/DOCX、`.venv`、缓存或日志将进入变更；这些运行文件被 ignore。扫描不是穷尽的秘密证明。前端 `src/` 未改。 |

此次**未运行 GitHub CI**：两套修复均未提交/推送，远程 PR 当前仍指向旧 head；原审查报告所载 CI 成功只属于旧提交，不能当成修复后的 CI 通过。未进行恶意文件压力测试、真实浏览器联调或 Replit 部署。

## 5. Yuan 的前端 Real Client 最小修复表

当前真实文件 `src/services/api.ts:7-27` 未在本轮修改。用该文件同形状请求对修复后 FastAPI TestClient 复测：normalize **422**、confirm **422**、trends **404**、recommend **422**、roadmap **404**。

| 前端当前行为 | Backend 实际契约 | 最小前端动作 |
|---|---|---|
| `POST /profiles/normalize` 发送 `{profile}` → 422 | `NormalizeRequest`：`pipeline:'A'`, `input_type`, `synthetic_input:true`, `text`/`form`, `study_constraints`；返回 `data.profile` | 构造真实 intake DTO，保存 `profile_id`/`revision`；不要直接提交 UI `Profile`。 |
| 无 CV upload 客户端 | `POST /profiles/upload` 用 `multipart/form-data` 的 `file`, `synthetic_input`, JSON 字符串 `study_constraints`，可选 `preferred_field_id` | 增加合成 PDF/DOCX 上传，浏览器自行生成 boundary；展示 400/413/415/422 与人工确认页。 |
| `POST /profiles/confirm` 发送 `{profile}` → 422 | `profile_id`, `skills[]`, `reviewed_by_user:true`，**二次修改必带当前 `profile_revision`** | 首次也建议带 normalize 返回的 revision；保存每次确认响应的 `data.profile_revision`；409 时提示刷新冲突。 |
| `GET /trends` → 404 | `GET /trends/roles`、`GET /trends/skills` | 调正确路径并适配两个分页列表及数据来源标签。 |
| 推荐提交 `scenario_id`、UI profile 和 `target_role_id` → 422 | `POST /recommendations`：`profile_id`, `ai_scenario`, 可选 `preferred_field_id`,`snapshot_id`,`top_k`；返回 `data.recommendations[]` | 用确认后的服务端 ID；展示 `score_breakdown`、gaps、evidence、`meta.data_label/is_mock`；不要把预测值当 observed。 |
| 无 Skill Map 调用 | `POST /learning/skill-map`：`profile_id`,`role_id`,`skill_id`,`language`,`budget_amount`,`currency` | 从确认画像、推荐角色和真实缺口选择 ID；候选课程无正式 verified badge。 |
| `POST /roadmaps/full` → 404 | `POST /learning/roadmap`：`profile_id`,`role_id`,`selected_skill_ids[]`,`study_constraints` | 发送角色所需的真实 gap skill IDs。 |
| 把整个 JSON 强转业务类型；失败仅显示通用状态 | 成功为 `{data,meta}`；错误为 `{error:{code,message,details,retryable},meta}` | 解包 `data`，保留状态和 request ID；按 409/422/502/503 显示对应冲突、输入、模型和 P1 不可用提示。 |

现有 `adopt`、任务 PATCH 与组织调用也没有对应已实现 A Flow 路由，不能把它们算作联调已完成。部署来源必须配置 `FRONTEND_ORIGINS`；默认只列本地开发来源。由 Yuan 在前端分支处理，本轮未修改前端源码。

## 6. 判定、阻塞与后续顺序

**本地修复代码：** 未确认新的 P0；F-01/F-02/F-04 已修复且回归通过。F-03 的体积入口漏洞已缩小，但文档解析硬时限/入口资源配额仍是**公网上传部署关口**；F-05 的真人审批仍是**正式数据启用关口**；F-06 当前前端 real 客户端仍是不兼容的**Live 联调关口**。这三个关口不能用后端 pytest 代替。

**PR #1：** 本地修复可进入人工 Review；远程 PR #1 仍是旧 head，因此在修复被单独提交、推送并通过新 CI 前，远程状态为 **CHANGES REQUIRED**。**PR #4：** 本地叠加代码可进入人工 Review；依赖 PR #1 的修复，远程 PR #4 也仍为 **CHANGES REQUIRED**。未来 PR #1 合并后，核对历史再调整 #4 base 并跑 CI；本轮不执行。

**建议提交/推送顺序（仅在另行授权后）：**

1. 在 `feature/backend-integration` 的独立工作树只提交 PR #1 的 `app/main.py`, `app/services.py`, `app/scoring_validation.py`, `app/upload_guard.py`, `tests/test_premerge_fixes.py`, `contracts/PROFILE_CONFIRM_AND_SCORING_ADDENDUM.md`, `README.md`；建议 `fix(backend): validate recommendations and profile revisions at trust boundaries`。推送更新 PR #1，等新 CI 与人工 Review。
2. 在 `feature/backend-ai-integration` 先安全同步已提交的 PR #1 修复，审查同名文件差异，保留本分支 Tech 增量；再只提交 PR #4 的 Tech policy、候选 coverage、候选 ID 导入防护、Tech 测试及 Tech/AI 交接文档和本报告。建议 `fix(backend): keep technical candidates unapproved and clarify coverage`。推送更新 PR #4，等叠加 CI；不修改已有 PR base 或合并任何 PR。

**Team Lead 必须决定/执行：** 确认上传契约与公开测试资源边界；配置受保护的独立数据审批及部署写权限；查原始 DOSM/TalentCorp/Microsoft Learn 来源、数值、用途、时长和条款；批准新 ID 和 reviewer-owned manifests；审查前端契约修复、演示措辞与 CORS 来源。`DATA APPROVAL=PENDING`，当前不得宣称公开数据已通过真实性验收。
