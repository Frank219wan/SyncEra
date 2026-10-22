# REQ-005 首页交接记录

日期：2026-10-21。基于本地 `前端1.2`，分支 `feat/frontend-ui`，基线 `01e96fe`。需求来源为项目目录中的 `Prompt_2.docx` 和 V1.1 前端 UI/UX prompt。本次修改留在本地工作区，未推送远端。

## 范围与文件

- `src/pages/Home.tsx`：将首页导出委托给 Landing；个人端和组织端组件保持原有实现。
- `src/pages/Landing.tsx`：首页、会话动画控制、竹藤与职业节点背景、可复用立体徽标、入口卡片。
- `src/pages/landing.css`：以 `.cinematic-home` 为边界的首页样式、响应式、入场及环境动画。
- `src/services/api.ts`：保持统一 `{data,meta}` 解析；为 multipart `/profiles/upload` 正确发送 `FormData`，不错误设置 JSON Content-Type。
- `src/pages/Intake.tsx`：real 模式的 TXT/PDF/DOCX 上传走 `/profiles/upload`，demo 模式继续只在本地读取 TXT，并明确拒绝未经服务端处理的二进制文件。
- 本记录：实施依据、维护方式和验证结果。

保留左侧标题与说明、右侧 Individual 在上 / Organization 在下且向右偏移的结构。原来 248px 的方形卡片扩大为可用列宽内的横向卡片，桌面约 519×238px，第二张右移 44px。760px 以下为单列，窄屏允许取消偏移。原 `/individual`、`/organization` 路由及后续业务流程没有改动。

## Contract 约束

已对照 `backend/contracts/FutureProof_AI_OpenAPI_v1_0.yaml`、运行时 `backend/app/models.py`、`backend/app/main.py`、`backend/docs/integration/API_ROUTE_AUDIT.md` 和 gap report。real 请求继续只使用 `/api/v1` 的已声明路径，统一要求成功 `{data, meta}`，错误保留 `{error, meta}` 和 request ID；JSON 请求保留 `application/json`，上传使用 `multipart/form-data` 让浏览器自动生成 boundary。上传的 `study_constraints` 按后端要求作为 JSON 字符串字段发送，并固定 `synthetic_input=true`。P1 `/progress/skills` 和组织分析仍明确返回未连接状态，不伪造同步或分析结果。

## 视觉与动画

浅象牙色、鼠尾草绿、稀疏竹藤 SVG 线稿替代首页摄影背景；竹节与细线职业路径、技能节点相连。无山水景观。保留 `connected growth` 标题和原三语副标题，新增三语简短说明，两张卡片的英文功能说明按需求原文保留。最新细化增加了独立的 `ink-stage` 绘画层：水墨晕染、左右竹竿、藤蔓、职业人物剪影、路径节点和笔尖沿路线移动，完成后降低到轻背景强度，避免持续抢过文字。

|阶段|实现|
|---|---|
|0–3.8s|水墨晕染和竹藤主线先绘制，职业剪影逐笔出现，笔尖沿职业路径勾勒|
|0–1.7s|页头品牌笔刷式 clip-path 展开（保留为底层装饰）|
|0.15–2.15s|立体徽标浮现|
|0.8–2.15s|两行主标题从 110px 下方通过遮罩上移|
|1.5–2.85s|副标题和两行说明从 75px 下方错时进入|
|3.05–4.15s|徽标和环绕文字在绘画层淡出后显现|
|3.25–4.85s|标题、说明和两张入口卡片以大幅度上移依次显现|
|4.2s 后|绘画层淡为总背景，保留植物、节点及徽标环境动画|

徽标用 CSS 渐变、立体变换与多片叶面组成，无新增依赖或 WebGL。文字通过 `rotateY` 围绕徽标运动，文字自身反向旋转保持正立；透视提供前后缩放，透明度提供纵深。它是实时动画，不是图片或视频。`FloatingBrandEmblem` 的 props 可调关键词、半径、周期、倾角、透视距离；CSS 的 `--emblem-float` 调整浮动幅度。默认半径 118px、周期 28 秒、倾角 18°。

沿用 `futureproof-home-intro` sessionStorage 键。首次访问立即标记，刷新和返回不重播，新的独立标签会话可以重播。浏览器存储不可用时显示完整静态入场结果，环境效果仍可使用。无加载遮罩、无禁用导航。键盘聚焦入口立即取消该卡片入场延迟。卸载清理计时器和 visibilitychange 监听；隐藏标签暂停 CSS 动画。

暂停按钮控制环境动画。系统 prefers-reduced-motion 下禁用全部入场、环绕与过渡，并呈现静止关键词。装饰使用 aria-hidden、pointer-events:none，文本仍是真实 DOM，入口是语义链接，继承全局焦点轮廓。

## 实际验证

- `pnpm build`：最终通过，含 `tsc -b` 类型检查。首次构建发现共享 icons 未导出三个新增图标，已改为从既有 lucide-react 直接导入后修复。
- `pnpm test`：17 项通过，0 失败（domain、api-contract、routing）。未变更业务接口逻辑。
- `impeccable detect --json src/pages/Landing.tsx src/pages/landing.css src/pages/careerContours.ts`：61 项 advisory 为与旧 DESIGN.md 的颜色、字号、圆角基准差异；另有 1 项 Georgia 字体未记入旧 DESIGN.md 的 warning。此次淡墨配色、艺术字、大字号与横向卡片遵循首页的明确要求；本文件是首页的新局部约束，未重写全站设计体系。
- 浏览器：桌面约 1331×871、平板 834×1112、手机 390×844、窄屏 320×740。检查左右/单列结构、卡片文本与无横向溢出。
- 个人入口鼠标导航、机构入口 Enter 导航正常；首次入场仍带 intro-active 时 Enter 可直接进入个人端。
- 首次入场绘画层先行，标题在约 4 秒开始逐字出现，卡片约 4.38/4.57 秒错位入场；返回及刷新均无 intro-active。
- 两次读取轨道 transform 得到不同 matrix3d，确认实时运动；暂停后 animation-play-state 为 paused。
- 英文、中文、马来语首页文本检查；卡片说明遵照要求始终为英文。
- 新开测试标签无控制台错误。开发中旧标签曾留有图标导入修复前的 HMR 错误记录，最终新加载无该错误。

## 验证边界与后续开发

项目没有 lint 脚本，因此未声称 lint 通过。当前浏览器工具未提供系统 reduced-motion 模拟接口，该分支完成代码审查，但没有切换操作系统偏好来实测；隐藏标签暂停同样经过代码检查。未进行低端真机帧率分析或自动化屏幕阅读器测试。现有后端连接模式与数据真实性标记保持原状，本次未接入额外后端。

运行：在此目录执行 `pnpm dev`，访问 `http://127.0.0.1:5173/`。前端 real 模式默认请求 `http://127.0.0.1:5175/api/v1`；旧版本可改用其他 51XX 端口运行。编辑 Landing.tsx 或 landing.css 后可热更新；要再次观察完整入场，用新的独立浏览器标签会话打开首页。构建产物在 dist，验证日志在被 Git 忽略的 artifacts/req005。

后续首页视觉迭代：出场专用的竹林、藤蔓及六组职业轮廓放在 `intro-forest` / `intro-careers`，约 5.65 秒后卸载；人物路径在 `src/pages/careerContours.ts`，按用户最新提供的黑白线稿参考图提取并简化，保留建筑工、油漆工、厨师、服务员、医生、建筑师的服装与道具轮廓。静态竹叶恢复为四组、爬山虎五组且位置错落。常驻背景只保留缓慢光影和小幅鼠标视差，暂停按钮与 reduced-motion 设置会限制动态效果。两张入口卡片各有两层偏移底框，原卡片作为最上层。2026-10-21 再次执行构建、17 项测试与浏览器开场/结束画面检查，均通过。

颜色细化：左侧常驻竹茎上部为中等黑绿、向下渐浅，顶部黄绿渐变叶片；右侧藤茎上浅下深、下部为中等黑绿，底部橘绿渐变叶片。开场专用叶片改为更浅的绿、黄、橘渐变，少量枝线使用暖色。人物线稿使用深绿至暖灰渐变；浅色底线和人物内的柔和底色隔开繁茂植物。人物集中在画面中部并错落排布，避免与两侧密集叶群重叠。

最新常驻背景微调：依据用户色板 `#193D2F`、`#2F6F46`、`#CFE0D6`、`#EADFCC`，左上竹茎及叶片、右下藤茎及叶片进一步加深，延续相反方向的纵向渐变；竹叶每组新增错落小叶，顶部增加黄绿叶；藤叶增加侧生小叶且底部混合橘绿。两张入口卡片及其叠层的边线加深，卡片尺寸、文字与开场专用绘画层不变。构建和浏览器常驻画面检查通过。

旧 `.impeccable/design.json` 与 DESIGN.md 存在时间戳漂移，这是既有状态；如需统一全站设计记录，可另行运行 document 更新。
