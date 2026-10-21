# 交接与续作记录

更新时间：2026-10-21。用户最高需求依据：https://chatgpt.com/share/6ad79b9f-cc3c-83ec-8c8f-c23cfbff1670。

## 已完成界面

入口 /；个人 /individual、/radar、/intake、/intake/profile、/intake/review、/analyzing、/recommendations、/roles/:roleId、/skills/:skillId/mind-map、/roadmap/draft、/roadmap/:planId（后 10 个路径带 /individual 前缀）。
组织 /organization；企业 /organization/hr/{intake,heatmap,mobility,training,dashboard}；院校 /organization/tvet/{students,trends,gaps,cohort,insights}。

原文未明确枚举四阶段和四目标时，采用学生／应届毕业生／在职／重返职场，以及探索／首份工作／转行／提升。Organization 使用匿名可编辑资料、已知与未知基础分离、可追溯的所选群体统计、必填和唯一编号校验。后续获得更具体枚举可在 data/Intake 内替换。

## 已验证

TypeScript 检查通过；生产构建通过（最终发布前复建）；5 个领域测试通过：未知基础、群体选择、重复编号、采纳门槛及幂等完成与改期保留、修改画像不伪造分数。
浏览器已实际点击个人资料样例、全部确认、分析、推荐、情景切换（86→79）、技能地图、草案、采纳、完成任务（0→1/10）、改期。HR 已通过资料分析、热图单元明细、员工×技能培训、阶段确认和概览；TVET 已通过学生→趋势→差距→手选两人→洞察及建议依据。
截图见 .impeccable/review。首页检查 1280×720、1440×900、390×844；内页全页检查 1366×768。其余尺寸和真实后端不属于已验证项。设计检测器一次运行结果为空；最终独立评审见 finish-review.md。

## 后端接入清单

src/services/api.ts 已定义请求适配器；默认 demo 不产生网络分析请求。以 /api/v1 为前缀：

|请求|用途|
|---|---|
|GET /health|部署健康检查|
|GET /trends/roles|带快照与证据 ID 的职业趋势|
|GET /trends/skills|带快照与证据 ID 的技能趋势|
|POST /profiles/normalize|画像规范化|
|POST /profiles/confirm|确认画像|
|POST /recommendations|同一未来时间点的情景匹配|
|POST /learning/skill-map|单技能学习图与核验资源|
|POST /learning/roadmap|约束下的完整计划|
|POST /progress/skills|活动／技能确认与竹节进度|
|POST /organizations/hr/analyze|HR／L&D 合成群体分析|
|POST /organizations/career_centre/analyze|院校合成群体分析|

适配器现已按 `API.md` 的 `/api/v1` 成功／错误 envelope、稳定 ID、快照、画像确认、推荐、Roadmap、进度和机构路径实现。还需后端认证、授权、持久化、完整 schema 验证、错误本地化、幂等键、文件解析、真实趋势来源和 snapshot 历史、确定性匹配算法及版本并发控制。真实 mode 下 Radar、Role 与 MindMap 的部分说明仍保留静态展示文案，必须在端到端集成测试后才可视为生产接入。API 失败不得静默回退为演示数据。

当前费用、工时和可行性均为标明的示例。学习时间、预算、语言、日期、已有基础可编辑并保存；真实课程价格和排期约束需要后端求解。用户任务确认是自我报告，不是认证或能力判定。

## 资源

背景为 imagegen 原创植物照片，生成提示嵌入 PNG。字体为自托管 Noto Sans / Serif 及 SC 包；图标为 lucide-react。资源链接仅使用已核验 Python、PostgreSQL、Microsoft Learn、联合国 SDG 官方页面；无来源的技能明确显示待补充。

## 发布

Sites project_id: appgprj_6ad79e021d708191ad91460917418cd5。保持所有者私有。发布状态与版本记录另见 DELIVERY.md。不要重复创建站点，不要记录凭证。完成后关闭 05-57-futureproof-ui 自动化。

## Prompt_1.md 实施补充（2026-10-21）

- 首页现有竹与常春藤植物加入约 4 秒、每个浏览器会话一次的展开动画；遵从 `prefers-reduced-motion`，保留原卡片位置和轻微背景呼吸效果。
- 侧栏只保留品牌标志作为首页入口；“My Growth”和“Learning Journey”是固定独立导航。HR / TVET / 个人上下文从 URL 推导，并新增路由测试。
- 今日计划改为个人首页内默认收起的展开区；任务各自展开、提供学习资源，完成必须人工确认并填写反思。学习旅程按技能分组展示当前和归档计划，重复技能不会合并掉计划来源。
- HR 输入改成部门优先：职责、状态、挑战、目标、申报人数；员工资料可选。员工 CSV 支持列映射、预览、唯一编号/部门校验和显式确认。XLSX、PDF/DOCX 解析仍待解析库/服务。
- HR 概览显示用户申报人数、部门、员工资料数和人工实施状态，并保留用户提交的本地规划快照版本。该预览不是 AI 分析。
- localStorage 保存仍仅限此浏览器/设备；尚无机构账号隔离、服务端鉴权或同步。缺失后端时，机构 AI 分析与学习进度服务在 real mode 明确报不可用，不返回伪造成功。
- 验证：TypeScript `--noEmit`、Vite production build 和 17 个 Node 测试通过。执行 `pnpm` 时受 minimum-release-age 检查阻止：锁文件中的 `electron-to-chromium@1.5.461` 尚未达到策略年龄；没有放宽策略或改锁文件。已使用当前已链接依赖直接运行检查。
