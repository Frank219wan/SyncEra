# Career / Skill 季度入库交接（本地候选，未上线）

## 当前交付与边界

- `backend/data/career_sources_q2_2026_seed.json` 是**人工核对后整理的种子 manifest**：DOSM 2023-Q2（7,779）、2026-Q1（20,089）、2026-Q2（19,899）的 Software Developers 数值，eMASCO `2512` 职业组与 `2512-01` 具体岗位，以及 eMASCO 页面可见的三项技能。产品明确指定 **Moderate=2023-Q2、Fast=2026-Q2**；2026-Q1 仅归档备用。
- 19,899 是 DOSM 报告中的 **Software Developers 组**数量，绝不是 `2512-01` 单个岗位数量。`2512` crosswalk 由职业名称与 eMASCO 编码对应推定，保留在 `limitation`；若将来获得 DOSM 原始编码表，以原始编码表复核。
- 三项技能的文本来源为 eMASCO 当前网页；**技能等级 3 和重要性是项目人工设定**，不是 eMASCO 或 DOSM 给出的等级。
- 目前样例没有 LLM 生成的技能，也未调用 MiniMax。新的 `role_skill_assertions` 允许存储 `ai_generated` 记录，但必须保留 `model_version`、`prompt_version`、`generated_at`，且前端要显示“AI 生成”。这响应产品侧允许存储 AI 补齐数据的决定，不可将其显示为官方要求。
- 预置 Manifest 的具体岗位、技能记录和技能断言在入库时分别保持 `is_active=false`、`is_active=false` 和 `draft`；尚未获得 reviewer-owned 审核清单，不自动激活在线职业目录或技能投影。
- 当前只完成离线入库路径；FastAPI 推荐仍使用已有静态目录。写入 SQL 表**不会自动切换**线上匹配。也不写入真实 CV、个人信息或 API Key。

## 一季度一记录，未来如何追加

`dosm_demand_quarters` 主键由 `unit_group_code + period + region + source_id` 组成。新增季度时在 manifest 中增加来源文档及观测记录，例如 `2027-Q1`，保留此前季度，不能覆盖旧来源 ID 的内容。来源记录保存 URL、发布日期（若已知）、采集时间、内容摘要和处理方法版本；eMASCO 来源摘要也覆盖其职业—技能映射与引用摘录，变更后不能沿用旧 `source_id`。不同来源对同一组/季度/区域给出冲突观测三元组（岗位数、报告总数、统计序列）时，导入拒绝写入，需人工核对。

每条需求记录带 `measurement_series_id`、`quality_status` 与 `scenario_eligible`。2023-Q2 的“vacancies”与 2026 的“offerings”口径尚未核对，分别存于不同统计序列，不用于直接计算增长率；但它可以被**显式产品锚点**选为 Moderate 的历史参照。2026-Q1 当期报告及 Q2 信息图都给出 20,089；Q2 媒体声明回顾附表却将 17,722 标成 Q1，而 Q1 附表将 17,722 标为 2025-Q4。Q1 标为 `reviewed_conflict`、`scenario_eligible=false`，仅归档并保留审核理由；**这不代表 DOSM 已正式发布更正**。

## 固定两档：Moderate / Fast

保留 API Contract v1.0 的 `ai_scenario: "moderate" | "fast"`，不要求新进度条字段。`scenario_reference_anchors` 按职业组、区域、目录版本明确存储两档时期与各自 DOSM 来源：Moderate 选 2023-Q2，Fast 选 2026-Q2。`select_fixed_scenario()` 返回观测值、URL、日期、数据粒度和质量状态；不能把职业组计数冒充具体岗位计数。

2023 与 2026 的原始计数不可因名称相同就直接做增长率；如将各期职业组招聘数换算成同报告的总招聘占比，也仍是**项目评分启发式**，不等于 AI 发展速度的实测。不同季度可以产生不同市场分数，但要出现不同的职业排名，还必须有至少两个有同级别季度数据和技能要求的候选职业；当前只有一个岗位，不可能证明“排名已变化”。

离线 `select_fixed_scenario()` 现会另外给出可复现的 `market_share_percent` 和 `market_signal_score`：同报告职业组计数 ÷ 同报告总计数；项目人为设定 **5% 占比映射 100 分、封顶 100 分**。Software Developers 对应的 Moderate 为 `7,779 / 261,231 = 2.98% → 59.56`，Fast 为 `19,899 / 555,509 = 3.58% → 71.64`（均展示两位小数，内部先用原始分数计算）。这只是候选**市场分量**，不是现有 API 的 `match_score`，也没有接入用户技能、兴趣或偏好加权；跨年份方法可比性待核验。

“职业招聘热度可作为 AI 发展速度的代理变量”是**产品假设**，不是 DOSM 对 AI 影响的测量或因果结论；招聘量还可能受经济周期、招聘平台覆盖率等因素影响。界面应显示“历史职业热度情景参照”，而非“AI 速度预测”。`career_skill_quarter_versions` 是给有**当期岗位技能证据**的快照预留的表；当前 eMASCO 网页采集于 2026-10，不能倒填成 2023 或 2026-Q2 的技能事实。若所选季度没有技能版本，必须标注“当前版技能；非该季度历史技能”，不能声称 Skill Gap 随季度已变化。

该固定映射目前**未接入正式 Matching Score**；旧的同比乘数方案已从本地候选实现删除。现有网页两档切换可保留，接线须增加 SQL 数据读取及后端独立评分校验。

### 与现有 API 的接线约定（待 API Contract 更新）

继续接收 `ai_scenario: "moderate" | "fast"`。响应需要返回实际 `selected_period`、DOSM `source_id/source_url`、市场数据粒度、质量状态、所用技能版本及其来源，并标出“AI 速度代理假设”。现有 API 尚未实施这些字段，不能把本文当成已上线的接口承诺。

当前离线函数 `select_fixed_scenario(manifest, unit_group_code="2512", region="MY", scenario="moderate"|"fast")` 已返回完整来源。API 接线应通过 PostgreSQL repository 读取入库行与锚点，而不是长期依赖 JSON 文件。

## 入库顺序

1. 先取得新 HEAD 的全绿 CI、独立 Review 和部署负责人对 Preview 写入的授权。只对**独立 Neon Preview** 核对项目、分支、直连 Endpoint、数据库和现有 schema。`backend/scripts/migrate_career_sources.py` 按顺序运行 `20261022_01_career_radar.sql` 与 `20261023_03_career_sources_quarters.sql`；它会识别完整已有的基础 Career Radar 表并跳过第一份迁移，发现部分基础表或任何已有的来源表时拒绝自动迁移，要求人工核对 PR #20/#21 的对象及兼容性。不得盲目重复执行 SQL。
2. 安装 `backend/requirements-data.txt`。在仓库根目录运行 `python backend/scripts/import_career_sources.py backend/data/career_sources_q2_2026_seed.json`；默认仅校验并打印摘要，不联网、不写库。
3. 写入时提供单独授权的 `NEON_API_KEY`、直连 `DATABASE_URL` 和 `CAREER_IMPORT_TARGET=preview`。URL 必须使用 `sslmode=verify-full`（可加 `channel_binding=require`）；导入器用系统 CA 验证 TLS。经部署负责人授权后，先运行 `python backend/scripts/migrate_career_sources.py --apply-preview`，再对同一 Manifest 使用导入脚本的 `--apply-preview`。两个入口的底层函数都先解析 URL，并通过 Neon HTTPS 控制面交叉验证代码审阅过的项目 ID、分支 ID、项目/分支名称、读写 Endpoint hostname 和数据库名称；连接后还检查 `current_database()` 与实际协商的 SSL。控制面不可用、元数据不符、非直连、TLS 不合要求或连接失败时一律拒绝写入。仅改变 `CAREER_IMPORT_TARGET` 或其他环境变量不能改写代码中的允许目标。Neon Preview 项目里的 `primary/default` 分支标记不是 Production 判据。请勿打印连接串或 API Key。
4. 查询 `futureproof.source_documents`、`masco_occupations`、`dosm_demand_quarters`、`scenario_reference_anchors` 和 `role_skill_assertions`。同一职业组、季度、地区的 `job_offerings`、`total_job_offerings`、`measurement_series_id` 必须完整一致；冲突使整个事务回滚。导入器对该键持有事务级 PostgreSQL advisory lock，防止并发导入绕过检查。预期 `2512 / MY` 归档三期：`2023-Q2=7779`（Moderate 锚点）、`2026-Q1=20089`（备用）、`2026-Q2=19899`（Fast 锚点）；`2512-01` 无独立招聘数。`career_skill_quarter_versions` 暂无历史行。
5. 只在准备好 SQL catalogue repository、后端独立校验、前端来源标签和闭环测试后，才考虑将该岗位投影到在线推荐。当前脚本不激活 `public_open` Snapshot。

## MiniMax 补齐的插入点

现有 `propose_position_skills()` 是**禁用默认、只读、待审核草稿**，且只接受旧的五技能静态目录；不能直接拿它的结果覆盖新 SQL 技能库。下一步需给离线生成器输入已核实 `masco_code`、岗位名称/任务及**当前 SQL 技能清单**，让 MiniMax 只返回清单内 `skill_id`、建议等级/重要性；随后做结构验证、去重和来源标记，写成 manifest 中的 `origin: "ai_generated"` assertion。产品已允许这类数据作为持久化需求，但源标签必须一直保留为 AI 生成。密钥只在后端或离线环境变量中，不提交到仓库。此轮未启用该生成器、未消耗 API 额度。

## 仍需接线与验收

- PostgreSQL 实际 migration / 导入验收：当前开发环境未配置 `TEST_DATABASE_URL` 或 `DATABASE_URL`，只做了模型校验和 dry-run。
- 把 SQL 目录读取接入检索/匹配，并扩展后端 independent scoring validation 与 API Contract；否则实时推荐还是合成目录。
- 多季度可比性与两端锚点复核、更多 DOSM 编码映射、历史职业技能版本的独立来源、MiniMax 离线补齐及人工抽查、前端两档与 AI/官方来源标签。
- 同步更新旧的 `CAREER_RADAR_HYBRID_RAG.md` 与 `AI_BACKEND_HANDOFF.md` 中“生成技能不得入库”的旧规则，避免产品决策与工程文档矛盾；在本地候选方案验收前不要提前改线上规则。

## 核验来源

- DOSM 报告：[Big Data Analytics: Job Market Insights Q2 2026](https://www.dosm.gov.my/site/downloadrelease?id=big-data-analytics-job-market-insights-q22026&lang=English)
- DOSM 报告：[Job Market Insights Q1 2026](https://www.dosm.gov.my/site/downloadrelease?admin_view=&id=big-data-analytics-job-market-insights-q12026&lang=English)、[Q2 2023](https://www.dosm.gov.my/site/downloadrelease?id=big-data-analytics-job-market-insights-and-my-job-profile-second-quarter-of-2023&lang=English)
- DOSM 数值交叉核对：[2026-Q1 媒体声明 Exhibit 2](https://www.dosm.gov.my/uploads/release-content/file_20260625115449.pdf)、[2026-Q2 信息图](https://www.dosm.gov.my/uploads/release-content/file_20260818075305.pdf)；冲突附表：[2026-Q2 媒体声明 Exhibit 2](https://www.dosm.gov.my/uploads/release-content/file_20260818075401.pdf)
- eMASCO 职业组：[2512 Software Developers](https://emasco.mohr.gov.my/masco/2512)
- eMASCO 具体岗位与技能：[2512-01 Software Developer](https://emasco.mohr.gov.my/masco/2512-01)

eMASCO 网页提示其新版网站仍在改进，内容可能变化；每次重新采集需要新的来源版本及时间，不静默覆盖旧来源。
