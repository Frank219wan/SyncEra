# 交接与续作记录

更新时间：2026-10-21。用户最高需求依据：https://chatgpt.com/share/6ad79b9f-cc3c-83ec-8c8f-c23cfbff1670。

## 2026-10-21 Tech 集成更新

Individual 的 `real` 模式现已完成 A 主链契约映射：表单画像规范化 → 用户确认 → 趋势 Snapshot → Moderate/Fast 推荐 → Evidence 查询 → Skill Mind Map → Roadmap。UI 直接展示后端的分数拆解、匹配理由、优势与差距、Evidence ID／URL／日期／限制、情景假设与不确定性；路线图时长、容量、可行性、警告和进度分母均来自服务响应。后端拒绝与已确认画像、角色目录、Snapshot、情景公式或排序不一致的 Adapter 输出。

`.github/workflows/backend-ci.yml` 现由 Backend、Frontend、Individual live contract 三个作业组成；根目录 `.replit` 通过 `scripts/run-replit.sh` 同时启动真实 Tech Adapter、FastAPI 和 Vite。候选 Snapshot／课程仍未取得 Team Lead reviewer-owned approval，不会自动激活；Organization 与进度写回仍属于 P1／演示范围。修复与外部评审项的对应关系见 `docs/REVIEW_RESOLUTION.md`。

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

适配器现已按 `API.md` 的 `/api/v1` 成功／错误 envelope、稳定 ID、快照、画像确认、推荐、Roadmap、进度和机构路径实现。Individual real mode 的 Radar、Recommendation、Evidence、MindMap 和 Roadmap 已绑定服务数据并有跨栈联调测试。仍需认证、授权、生产持久化、错误本地化、幂等键、真实 Snapshot 历史、Team Lead 数据批准，以及 Organization／进度写回的 P1 服务。API 失败不得静默回退为演示数据。

当前费用、工时和可行性均为标明的示例。学习时间、预算、语言、日期、已有基础可编辑并保存；真实课程价格和排期约束需要后端求解。用户任务确认是自我报告，不是认证或能力判定。

## 资源

背景为 imagegen 原创植物照片，生成提示嵌入 PNG。字体为自托管 Noto Sans / Serif 及 SC 包；图标为 lucide-react。资源链接仅使用已核验 Python、PostgreSQL、Microsoft Learn、联合国 SDG 官方页面；无来源的技能明确显示待补充。

## 发布

Sites project_id: appgprj_6ad79e021d708191ad91460917418cd5。保持所有者私有。发布状态与版本记录另见 DELIVERY.md。不要重复创建站点，不要记录凭证。完成后关闭 05-57-futureproof-ui 自动化。
