# Skillogy

Skillogy 是面向个人与机构的 AI 辅助职业探索与技能提升平台，通过职业趋势、技能差距与可执行学习路径，支持用户自主规划成长。


React + TypeScript + Vite 前端与 FastAPI 后端。默认英语，可切换中文和马来语。支持本地虚构资料演示，以及连接受保护 Preview API 的真实接口模式。

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

默认启动的是前端演示模式，只使用虚构测试资料。演示资料与计划历史存于此浏览器的 localStorage（futureproof-v1），不会跨设备同步。清除站点数据会清除本地进度。连接 API 的 Preview 仅供虚构、已授权的测试资料使用。

演示分数与图表只用于样例。连接 API 后，Individual 的画像录入／确认、职业推荐、技能地图与学习路线，以及 Organization B1 HR/L&D 和 B2 TVET 分析由同源 `/api/v1` 请求提供。职业排序、匹配分数和技能差距由确定性规则计算；界面不提供未经核实的工资、招聘数量或历史市场统计，也不代表课程认证结果。

`VITE_API_MODE` 默认 `demo`。设置为 `real` 后，Individual、Organization B1 和 B2 使用同源 `/api/v1`；跨栈测试见 `tests/cross-stack.test.ts`。Vercel Frontend Preview 由服务端 Function 代理至受保护的 Backend Preview；部署前须分别核对 Preview 数据库、服务器端代理凭据和访问保护，参见 [Preview API 代理](docs/VERCEL_PREVIEW_PROXY.md)。默认后端 AI 适配器为确定性实现；可选 MiniMax-M3 仅用于获准的文本画像提取，不负责职业评分。`real` 不表示生产数据已获批准。详见 [完整栈集成状态](docs/INTEGRATION_STATUS.md)。

### 安全演示与 Preview 分享

本地无需云端服务：运行 `pnpm dev`，保留默认 `demo` 模式，在 Individual、HR 或 TVET 页面选择虚构样例。真实接口验收只使用合成资料，不上传真实 CV、员工或学生记录；不要启用付费 AI 或未经审核的市场数据。

向外部评委分享受保护的 Vercel Preview 时，在对应 Frontend 部署的 **Share** 菜单创建 Shareable Link，先用无 Vercel 账号的无痕窗口验证页面及同源 API，再私下交付链接。分享令牌只应通过私密渠道传递，不得提交到仓库、公开 Issue 或 PR。Backend 部署保持访问保护。

按个人流程逐项测试，请从 [Individual-first 测试计划](docs/TEST_PLAN_INDIVIDUAL_FIRST.md) 开始。

### VS Code 本地全栈运行

首次运行先执行 `pnpm install --frozen-lockfile`；在 `backend/` 创建 `.venv` 并运行 `.venv/bin/python -m pip install -r requirements.txt`。然后在 VS Code 运行 **Terminal → Run Task → Start FutureProof full stack (dev)**。前端地址为 `http://127.0.0.1:5174`，后端地址为 `http://127.0.0.1:8001`。单进程预览任务的地址为 `http://127.0.0.1:8765`。

## Backend 与 Tech 集成

仓库包含 `backend/` FastAPI 服务、Tech v0.1.0 确定性 Adapter、DOSM／TalentCorp 候选 Snapshot 和 Microsoft Learn 候选课程。进入 `backend/` 后按 [Backend README](backend/README.md) 和 [Tech Integration](backend/tech_delivery/INTEGRATION.md) 操作。

候选来源与课程已经完成技术预检，但 `TECHNICAL_PRECHECK_NOT_FOR_ACTIVATION` 不是 Team Lead 治理批准。替换为真实 reviewer-owned approval manifest 前，不得把候选数据声明为已批准生产数据。

根目录 `.replit` 会构建 real 模式前端，并由 FastAPI 在同一端口提供网页、前端路由和 `/api/v1`。部署前需提供 Node.js 22+、Corepack 和 Python；本地验证可运行 `pnpm install --frozen-lockfile`、`pnpm test`、`pnpm build`，再运行 `backend` 的 `pytest` 与跨栈测试。锁文件暂时固定 `electron-to-chromium@1.5.459`，使新环境能通过依赖等待期检查；未降低该策略。
