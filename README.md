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

- 25 个主要路由及未找到页面：首页、个人成长与学习旅程、组织入口、HR 部门详情与工作区、TVET 工作区。
- 职业雷达、画像录入与确认、情景推荐、职业详情、技能地图、计划草案、采纳与任务确认、成长、改期和历史。
- HR 部门优先录入、员工资料可选、CSV 列映射/预览/确认、人工实施状态和本地规划版本历史；员工技能热图与培训进度仍需可选的员工资料。
- 院校学生编辑、趋势、个人差距、手动选群、汇总图表、建议依据和导出。
- 中英马三语、键盘焦点、弹窗焦点约束、错误和空状态、桌面与窄屏布局。

## 数据与边界

这是前端演示，不是已连接真实 AI 或就业数据库的产品。只使用虚构测试资料。演示资料与计划历史存于此浏览器的 localStorage（futureproof-v1），不会跨设备同步。清除站点数据会清除本地进度。CSV 员工导入在本机预览并经用户确认后保存；当前未接入 XLSX/PDF/DOCX 解析。

固定推荐分数仅用于未修改样例；自填或修改画像不生成假分数。热图与群体图表依据当前演示输入计算。无真实工资、招聘数量或历史快照。PDF/DOCX 提取、真实评分、课程推荐和认证评估均尚待服务接入。TXT 可本地读取。

VITE_API_MODE 默认 demo。real 模式的请求适配器遵循 `API.md` 的 `/api/v1`、`data/meta` 与 `error/meta` 规范，但尚未完成真实数据的全界面绑定与跨栈验证，不能直接视为生产模式。详见 docs/HANDOFF.md。

## Backend 与 Tech 集成

`feature/tech-integration` 分支包含 `backend/` FastAPI 服务、Tech v0.1.0 确定性 Adapter、DOSM／TalentCorp 候选 Snapshot、Microsoft Learn 课程资源及完整联调测试。进入 `backend/` 后按 [Backend README](backend/README.md) 和 [Tech Integration](backend/tech_delivery/INTEGRATION.md) 操作。

候选来源与课程已经完成技术预检，但 `TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION` 不是 Team Lead 治理批准。替换为真实 reviewer-owned approval manifest 前，不得把候选数据声明为已批准生产数据。
