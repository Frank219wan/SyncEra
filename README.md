# FutureProof AI UI

完整的浏览器本地交互演示，React + TypeScript + Vite。默认英语，可切换中文和马来语。按照用户分享对话的锁定选择实现；原始项目文档保持不变。

## 启动与验证

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
```

本机若 pnpm 不在 PATH，使用：

```powershell
node C:\Users\asus\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.mjs dev
```

默认预览 http://127.0.0.1:5173/ 。生产输出 dist。部署必须把前端路由回退至 index.html。

## 交付内容

- 23 个主要路由及未找到页面：首页、个人 11 页、组织入口、HR 5 页、TVET 5 页。
- 职业雷达、画像录入与确认、情景推荐、职业详情、技能地图、计划草案、采纳与任务确认、成长、改期和历史。
- 企业匿名团队编辑、技能热图明细、内部转型、培训进度、概览和导出。
- 院校学生编辑、趋势、个人差距、手动选群、汇总图表、建议依据和导出。
- 中英马三语、键盘焦点、弹窗焦点约束、错误和空状态、桌面与窄屏布局。

## 数据与边界

这是前端演示，不是已连接真实 AI 或就业数据库的产品。只使用虚构测试资料。演示资料存于此浏览器的 localStorage（futureproof-v1），不会跨设备同步。清除站点数据会清除本地进度。

固定推荐分数仅用于未修改样例；自填或修改画像不生成假分数。热图与群体图表依据当前演示输入计算。无真实工资、招聘数量或历史快照。PDF/DOCX 提取、真实评分、课程推荐和认证评估均尚待服务接入。TXT 可本地读取。

VITE_API_MODE 默认 demo。real 模式的请求适配器遵循 `API.md` 的 `/api/v1`、`data/meta` 与 `error/meta` 规范，但尚未完成真实数据的全界面绑定；不能仅因切换 real 就视为生产模式。详见 docs/HANDOFF.md。

## Backend 与 Tech 集成

`feature/tech-integration` 分支包含 `backend/` FastAPI 服务、Tech v0.1.0 确定性 Adapter、DOSM／TalentCorp 候选 Snapshot、Microsoft Learn 课程资源及完整联调测试。进入 `backend/` 后按 [Backend README](backend/README.md) 和 [Tech Integration](backend/tech_delivery/INTEGRATION.md) 操作。

候选来源与课程已经完成技术预检，但 `TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION` 不是 Team Lead 治理批准。替换为真实 reviewer-owned approval manifest 前，不得把候选数据声明为已批准生产数据。当前前端 `real` 模式仍待完成 API 全界面绑定。
