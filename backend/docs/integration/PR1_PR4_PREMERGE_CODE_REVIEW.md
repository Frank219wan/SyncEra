# SyncEra PR #1 + PR #4 合并前代码审查

审查日期：2026-10-21（MYT）。范围：`origin/main` → `024b4d6`（PR #1，45 个文件），`024b4d6` → `f1ad6da`（PR #4，29 个文件），以及组合后的 `f1ad6da`。已 `git fetch --prune origin`；本地工作树审查前干净。两个 GitHub PR 仍为 Draft，实际 base/head 分别是 `main` ← `feature/backend-integration`、`feature/backend-integration` ← `feature/backend-ai-integration`，均无合并冲突。PR #4 中的 PR #1 既有代码问题不重复归算为 PR #4 新问题。

## A. Executive Summary

| PR | 结论 | 原因 |
|---|---|
| #1 Backend Foundation | **CHANGES REQUIRED** | 未验证 Adapter 输出的业务语义（F-01）及缺省 revision 导致旧确认覆盖（F-02）已复现。上传体积限制的执行阶段也需在公网测试前处理（F-03）。 |
| #4 Backend + AI Integration | **CHANGES REQUIRED** | 技术模块与 A Flow 可运行，但候选 `skill_sql` 的 `observed_metrics.coverage=1.0` 缺少观测依据（F-04）。此外审批标记仅靠可编辑字符串识别，不能替代独立审核（F-05）。此 PR 依赖 #1。 |

**没有确认的 P0。** F-01、F-02 是建议合并 #1 前修复的 P1；F-04 是建议合并 #4 前修正的 P1。F-03 阻塞公网 Replit 上传测试；F-05 阻塞候选数据正式启用；F-06 阻塞当前 `main` 前端的 `real` 模式联调，但不是两个 PR 的新增改动。

## B. Findings

### P0

无已确认 P0。未发现未确认画像直接推荐、已提交密钥/私密 CV、由 HTTP 路由直接写 approved store、或当前正常启动自动启用 Technical Precheck 的证据。

### P1

**F-01｜P1｜PR #1，组合后仍存在｜`backend/app/services.py:121-132`、`backend/app/models.py:165-197`、`backend/app/main.py:169-179`。** 后端只核对 Adapter 的输出 Schema、分项分数加权总和、角色 ID、Evidence ID 和少量目录字段；没有根据已确认画像与选定 Snapshot 复算技能兼容度、技能缺口、预测分量或排序。临时注入的 Adapter 在“零技能”画像下返回四项 100 分、空缺口与有效 Evidence ID，HTTP 推荐仍为 200、`match_score=100`，而该角色有 3 项必备技能。当前 PR #4 内置规则模块自身给出合理结果，故问题归属 PR #1 的信任边界，不是声称当前规则模块已作假。影响：接入有误或不可信模型后可向用户发布失实推荐。最小修复：后端依据确认画像、目录、Snapshot 和场景复算/校验数值与缺口；无法验证时返回 502；补充“分数自洽但业务错误”的拒绝测试。**阻塞 #1 合并：是。**

**F-02｜P1｜PR #1｜`backend/app/models.py:150-155`、`backend/app/services.py:86-97`、`backend/app/storage.py:26-29`。** `profile_revision` 可省略。临时测试对同一画像连续发送两次不带 revision 的确认，均得到 200，revision 从 1→2→3，已确认的 SQL 等级从 5 被旧表单改为 1；带旧 revision=1 的重试正确返回 409。SQLite 的 `UPDATE ... WHERE revision=?` 正确防止同一瞬间的并发写冲突，但省略客户端版本时无法发现顺序到达的旧请求。影响：多标签页/重试丢失用户确认结果。最小修复：已确认画像的后续修改必须带旧 revision，缺失时返回明确 4xx，保留现有原子 CAS；首次确认是否也强制版本由 Team Lead 按冻结契约决定；加“旧表单顺序覆盖”测试。**阻塞 #1 合并：是。**

**F-03｜P1｜PR #1｜`backend/app/main.py:134-152`、`backend/app/cv_upload.py:20-25,41-60,73-103`。** 10 MiB 检查发生在 FastAPI/Starlette 解析完整 multipart 并建立 `UploadFile` 之后；PDF 10 秒检查仅在 `page.get_text()` 前后执行，不能中断一次超时的解析调用。静态证据足以确认限制不是请求入口的硬上限；未构造恶意文件或证明当前主机可被耗尽。影响：公开上传端点可能消耗临时磁盘、内存或工作线程，响应 413/422 也可能过晚。最小修复：在可信反向代理/入口设置整请求大小和并发限制，解析放入受资源/时间限制的隔离进程，增加超限/慢解析回归测试。**阻塞代码合并：否（仅限受控合成数据本地演示）；阻塞公网 Replit 上传测试：是。**

**F-04｜P1｜PR #4｜`backend/tech_delivery/snapshot_dosm_mycol_my_2026q2_v1.json:55-59`、`backend/tech_delivery/SOURCE_METHOD.md:38-44`、`backend/contracts/FutureProof_AI_OpenAPI_v1_0.yaml:1339-1350`。** `skill_sql` 的 `mention_rate` 与 `change_pp` 为 `null`，而同一 `observed_metrics` 中 `coverage=1.0`。来源说明仅给出“数据库技能大类→SQL”的人工映射及启发式 70 分，没有 100% 覆盖的样本/分母。PRD v1.5 的 coverage 也是观测性指标。影响：若未来激活，前端可能把 1.0 显示为已测得覆盖率。最小修复：在候选包中把 coverage 置 `null`，或由 Team Lead 核实具体观测定义、分子分母和计算证据后填写；补充数据语义测试。**阻塞 #4 合并：建议是；正式数据启用：必然阻塞。**

**F-05｜P1｜PR #4｜`backend/app/approved_data.py:127-128,155-164,228-248,262-269`。** 默认导入会拒绝 `reviewed_by` 以 `technical-precheck` 开头的清单，这一正常路径已测试通过。但在只改内存副本、不改仓库文件的边界测试中，将候选清单的 `reviewed_by` 改为 `unverified-reviewer`、时间改为当前时间，候选 Snapshot 即被标为 `public_open/is_mock=False`，课程资源也被接受。代码检查了字段格式与 URL 对应，无法证明审核人身份或实际看过原文。影响：有 approved 数据目录写权限的人员/流程可绕过人工审批；这是部署治理边界，非匿名 HTTP 可直接利用的路径。最小修复：由 Team Lead 在受保护的独立审批流程生成清单，并在激活前加入人工/CI 审核门；禁止把字符串检查称作正式数据真实性验证。**阻塞 #4 代码合并：否，前提是候选数据保持非活动；阻塞正式数据启用：是。**

**F-06｜P1｜现有 `main` 前端与 PR #1/#4 组合的集成边界；非 PR 新增｜`src/services/api.ts:15-27`、`backend/app/main.py:122-196`。** 当前前端 `real` 模式请求 `GET /api/v1/trends`、发送 `{profile}` 到 normalize/confirm、用 `scenario_id` 调推荐并期待无 Envelope 的结果；Backend 是 `/trends/roles|skills`、`NormalizeRequest/ConfirmRequest`、`ai_scenario` 与 `{data,meta}`。实际同形状请求分别返回 404/422/422/422。另有未合并的 `origin/feat/frontend-contract-integration` 含新 API Client，不能当作当前 `main` 已修复。影响：当前前端不能直接切换为 `real` 模式。最小修复：在前端分支做字段/ID/Envelope 映射与 Live 页面联调，连同合成 CV 上传、CORS 来源、错误提示验证；不得改冻结 API 以适配旧客户端。**阻塞 #1/#4 后端代码合并：否；阻塞前端 Live 联调完成：是。**

### P2

**F-07｜P2｜PR #1，组合后仍存在｜`backend/app/main.py:181-196`。** Skill Map/Roadmap 只要资源仓库中有任意条目即标 `mixed_demo`，即使当前请求没有匹配资源。影响：响应 provenance 粒度偏粗。最小修复：依据本次返回节点/步骤是否实际含审核资源生成标签。**阻塞 Merge：否。**

**F-08｜P2｜PR #1｜`backend/app/main.py:67-68`。** 捕获所有未知异常后统一回 503，没有结构化错误日志；MVP 故障排查较难。最小修复：记录无个人文本的 request ID、异常类型和栈，保留对外通用错误。**阻塞 Merge：否。**

### INFO / 产品和审批边界

**F-09｜INFO｜PR #4｜`backend/futureproof_ai/futureproof_adapter.py:13-22`、`backend/app/main.py:122-179`。** `create_adapter()`、`extract_profile()`、`score_roles()` 可调用，当前是 deterministic/rule-based，不是 LLM；`retrieve_trends()` 可调用，但 HTTP 推荐路由沿用 Backend 的 `trend_package()`。组合分支把推荐标为 `mixed_demo` 或 `synthetic_demo` 且 `is_mock=True`，没有因 `adapter.is_mock=False` 宣称端到端已真实审核。**阻塞 Merge：否；不得宣传 LLM/RAG 已实现。**

**F-10｜INFO｜PR #1/#4｜`backend/app/main.py:198-205`、`docs/product/FutureProof_AI_PRD_v1_5_Fused_EN_ZH.md:50,168-213`。** Bamboo Progress、B1/B2、LLM/RAG、自动市场刷新和 Replit 远程交付仍是目标范围；三个 P1 API 实测 503。CV Upload 是合同 v1.0 之外的新增可用接口，仅声明合成个人资料。**阻塞 Merge：否；演示叙述须限定已实现 A Flow。**

## C. Test Verification 与 CI

| 运行内容 | 实际结果 |
|---|---|
| `git fetch --prune origin`；分别 `git diff --check`、文件清单 | 成功；PR #1 45 文件、PR #4 29 文件；无空白错误，PR #4 未改 `src/`。 |
| `backend/.venv/bin/python -m pip check` | `No broken requirements found`。 |
| PR #1 的 `git archive` 临时副本：`python -m pytest tests -q -p no:cacheprovider` | **31 passed / 0 failed / 0 skipped**；本机 6 项依赖弃用警告。 |
| 组合分支：`PYTHONDONTWRITEBYTECODE=1 DATABASE_PATH=/private/tmp/futureproof_review_runtime.sqlite .venv/bin/python -m pytest tests -q -p no:cacheprovider` | **38 passed / 0 failed / 0 skipped**；本机 6 项依赖弃用警告。覆盖合成 PDF/DOCX、确认、Revision、Adapter、导入、Moderate/Fast、Skill Map、Roadmap。 |
| 组合分支 FastAPI import、Runtime OpenAPI、TestClient | 16 条 `/api/v1` 路径；合同的 15 条在规范化 `/api/v1` server prefix 后全部存在，新增仅 `POST /profiles/upload`；健康、Docs、OpenAPI 为 200；三条 P1 为 503。 |
| 临时 Uvicorn `127.0.0.1` + `AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter` | `/api/v1/health`、`/docs`、`/openapi.json` 均 HTTP 200。 |
| 未提交的临时边界测试 | 未确认推荐 422；无 revision 的二次确认 200→revision 3；注入虚高 Adapter 后推荐 200/100 分/零缺口；Technical Precheck 默认拒绝，伪造 reviewer 字符串后接受；旧前端请求 404/422。 |
| GitHub CI（当前各自最新 head） | [PR #1 run 39562469581](https://github.com/Frank219wan/SyncEra/actions/runs/39562469581) 成功；[PR #4 run 39583416874](https://github.com/Frank219wan/SyncEra/actions/runs/39583416874) 成功，日志中 `38 passed, 1 warning`，并执行 pip check、FastAPI import、Tech Adapter import、OpenAPI/P0 route 检查。 |

未运行：恶意 PDF/DOCX 压力测试（可能消耗资源）、Replit 远程部署、正式数据激活、前端浏览器 Live 全流程。GitHub CI 的 backend-only 通过不代表这些环节通过。

安全扫描：`git ls-tree` 中匹配敏感/运行文件名的只有 `.env.example`；本轮对 Backend/Workflow 的常见 key/token/private-key 模式无命中，`backend/data/profiles.sqlite` 存在于本地但被 ignore、未在 Git 树中。没有证明做过穷尽式秘密扫描。源代码未存储上传 CV 原文字节；SQLite 会持久保存提取后的画像字段，尚无删除/保留期机制，真实个人 CV 不具备演示授权。

## D. Data Governance Audit 与 Contract Compatibility

| 边界 | 核对结论 |
|---|---|
| Backend ↔ Frontend | **不兼容（现有 main 的 real client）**，见 F-06；独立前端分支存在但尚未并入本审查的两条 PR。CORS 默认只放行本地 3000/5173，实际部署前须明确设置 `FRONTEND_ORIGINS`。 |
| Backend ↔ AI | **CODE VERIFIED / TECHNICALLY TESTED**：配置模块可加载，输入 Pydantic Profile/TrendPackage，HTTP A Flow 可用；F-01 显示后端对未来 Adapter 输出的业务校验仍不充分。 |
| Backend ↔ Data | **TECHNICALLY TESTED / DATA APPROVAL PENDING**：`snap_my_dosm_mycol_2026q2_v1`（MY、2026 Q2）、DOSM 与 TalentCorp Evidence ID、`role_data_analyst`、`skill_sql`、Moderate 1.00 / Fast 1.05、Microsoft Learn `resource_mslearn_python_fundamentals_p1` → `skill_python` 均通过隔离导入与联调；正常导入拒绝现有 Technical Precheck。`public_open` 不是当前候选数据的正式状态。 |
| Backend ↔ Replit | `.replit` 和 `backend/.replit` 有启动命令及 PORT/0.0.0.0 支持；**未远程验证，不是 PRODUCTION READY**。公网测试前处理 F-03、CORS、合成数据隔离及 SQLite 保留策略。 |

原始来源核对：已读取 [DOSM Q2 2026 原始 PDF](https://www.dosm.gov.my/uploads/release-content/file_20260818075305.pdf)，其中 Business Data Analyst Q2 3,053、所列 STEM Technician 6,565；`100×3053/6565=46.50` 为所展示表内归一化，非市场份额。TalentCorp **候选所指的 exact PDF** 因 21 MB 文件超过网页读取限制，**UNVERIFIED**；[同机构相关官方报告](https://www.talentcorp.com.my/images/uploads/publication/204/MYMAHIR-MALAYSIA-CRITICAL-OCCUPATIONS-LIST-2024-2025-1762766315.pdf) 的检索片段支持 Data Professionals/MASCO 2524 与数据、分析、数据库技能大类，但不证明 SQL 的 70 分或 coverage=1.0。已读取 [Microsoft Learn 候选页面](https://learn.microsoft.com/en-us/training/paths/get-started-with-python-fundamentals/) 的标题及 4 模块；本次页面文本未显示 3.2 小时或 MYR 0，时长/免费条款仍待 Team Lead 再核。Team Lead 还须核实版权/再使用条件、来源日期与角色映射。结构验证不能代替真实性审批。

PRD v1.5 与 API Contract v1.0：合同基准 15 条路径，Runtime 16 条，上传为附加接口；Normalize→Confirm→Recommendations 一致。PRD 的 observed 指标与 scenario projection 分离在当前规则模块中成立，实际 HTTP 证据见 `backend/docs/integration/phase4_http/phase4_http_evidence.json`；但 PRD 期望的 LLM、RAG、Bamboo、B1/B2、完整多语言及已部署演示尚未实现。PRD 的候选 `coverage` 值需 F-04 修正。不能把计划功能算作代码 Bug，亦不能把确定性算法称为 LLM。

## E. Merge Recommendation

1. **PR #1 暂不建议合并 `main`**：先修 F-01 与 F-02，针对 F-03 明确入口级上传限制和部署边界，再重跑独立 CI。
2. **PR #4 暂不建议调整 base 后合并**：先等 #1 修复并合并，再按真实历史调整 base；先修 F-04、复跑组合测试与 CI。F-05 的正式审批可在代码合并后继续待办，但候选数据必须保持不活动。
3. 10 月 22 日内部合成数据演示可继续在受控本地分支推进；前端 Live 联调可以开始修客户端，但当前 `main` 的 `real` 模式不能直接使用。
4. Replit **仅具备本地启动配置**。受控合成数据环境可准备，公网远程测试须先处理 F-03、部署来源 CORS 和隐私/保留策略；本审查未验证远程运行。
5. Team Lead 必须批准：上传表单作为 v1 扩展、Confirm revision 兼容策略、DOSM/TalentCorp 原文与数值/映射/场景假设、SQL coverage、Microsoft Learn 费用与时长、真正 reviewer-owned manifests，以及 MVP 演示对 LLM/Bamboo/B1/B2/Replit 的措辞。

## F. Minimal Fix Plan（本轮未执行）

1. 在 Backend 验证/复算 Adapter 推荐的四个分项、缺口、强项和场景，仅接受与确认画像及 Snapshot 一致的结果；补一个虚高输出拒绝测试。
2. 至少对已确认画像的再次修改强制旧 revision；保留 SQLite CAS；补顺序旧请求冲突测试。
3. 将候选 SQL `coverage` 改为 `null` 或附原始分子分母；由 Team Lead 审核 exact PDF、日期、资源时长/费用，再生成独立 manifest。
4. 在公网入口限制整个 multipart 请求体与并发，隔离 PDF/DOCX 解析；复查临时文件清理。
5. 前端分支适配 v1 Envelope/ID/字段与合成 CV 流程，做真实浏览器联调；PR #1 合并后再调整 #4 base 并重跑 CI。
