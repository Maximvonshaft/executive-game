# Phaser3 多平台斗地主（单机 + 联机）开发方案 v1.2

## 0. 前期确认与决策记录

为确保正式动工前所有疑虑均已拍板，本节记录核心问题的结论与执行责任。

### 0.1 需求澄清

* **业务目标与 MVP**：坚持“可跨平台上线的 PvP 斗地主”作为首期目标，MVP 范围锁定在：登录/账号绑定、单机 + 标准 3 人实时对战、基础匹配、断线重连、结算面板与最小化的运营回流（Telegram `startapp` 深链 + 微信/抖音分享卡片）。排行榜、皮肤、赛事等进阶内容全部列入 v1.1+ 迭代池。
* **模块依赖关系**：交互原型与架构图已补充至内部 Confluence《Phaser3-DDZ-架构同步》文档，涵盖客户端场景流转、服务端房间服务、Bot 服务与数据层依赖，团队在评审会（D3-09-20）确认无新增耦合点。
* **兼容性矩阵**：必须支持微信小游戏 2.32+、抖音小游戏 3.0+、Telegram WebApp（移动端 iOS/Android、桌面 Windows/macOS 客户端）以及 Chromium/ Safari ≥ 15 的标准 H5 浏览器。测试矩阵已归档于 QA 的 `devices-matrix-v1.0.xlsx`，后续按周更新。

### 0.2 技术栈与工具链

* **语言与框架版本**：客户端统一 Node.js 18.18 LTS + pnpm 8.7.x + Vite 5；服务端 Node.js 18.18 + Fastify 4.24；Bot 服务 Node.js 18.18 + grammY 1.19；数据库 PostgreSQL 15，Redis 7。版本锁定写入 `.nvmrc`、`package.json#engines` 以及 `docker-compose.yml`。
* **代码规范**：前端采用 ESLint（`@antfu/eslint-config`）+ Prettier，服务端采用 ESLint（`eslint-config-standard-with-typescript`）+ Prettier，统一在仓库 `package.json` 的 `lint` 脚本中串联。TypeScript 配置启用 `strict`、`noUncheckedIndexedAccess`，并在 `lint-staged` 中追加。Python 辅助脚本遵循 PEP 8 + `ruff`。
* **测试与 Linter 命令**：约定每次提交前必须执行 `pnpm lint`、`pnpm test`（含客户端单测 + 服务端单测 + 共享库单测）以及可选的 `pnpm test:e2e`。CI 会在 GitHub Actions 上并行运行上述脚本，任何失败禁止合并。

### 0.3 项目结构与说明

* **文档阅读要求**：所有成员在入场前确认已阅读根目录 README、`development/phaser3-ddz-plan.md`（本文件）及 Confluence 的联机协议设计稿；无额外 AGENTS.md，约定后续若新增子仓或模块必须附带。
* **架构资料**：系统组件交互图、数据流与事件序列图已整理进 `docs/architecture/`（PR #42），并同步到 Confluence。多人协作需参考 `docs/architecture/modules.md`，其中定义了服务间接口与消息格式。

### 0.4 验收标准与测试策略

* **验收标准**：MVP 必须满足《对战核心验收清单 v1.0》，其中包含：1）单机三档 AI 行为正确；2）实时对战 30 连局稳定无崩溃；3）断线重连恢复 ≤ 3 秒；4）跨端同局延迟 ≤ 150ms；5）关键 UI 在三类断点上渲染正确。覆盖率目标为单元测试 ≥ 70%，关键逻辑（发牌、倍数计算、重连）必须有断言。
* **端到端测试**：关键路径包括登录、匹配开局、地主抢夺、出牌结算、断线重连、观战切换、战报推送。QA 将使用 Playwright + Telegram Bot 测试账号，结合容器化 Redis/PostgreSQL，在 CI 夜间任务中执行 `pnpm test:e2e`。
* **测试数据与环境**：`docker-compose.dev.yml` 已封装 Redis/PostgreSQL/MinIO，本地 `.env.sample` 提供默认账号、Bot Token 占位及模拟支付开关。所有成员须在开发前完成 `pnpm setup:env` 并验证服务可启动。

### 0.5 协作流程

* **协作工具**：Issue 与路线图使用 Linear，同步到 GitHub Project；PR 流程遵循“至少一名资深工程师 + 一名 QA”评审，合并策略为 squash。每日站会通过 Slack #ddz-dev 频道同步，关键架构讨论安排在周二/周四的 Zoom 例会。
* **多端里程碑**：阶段划分为：Milestone 1（H5 + 基础联机）、Milestone 2（小游戏适配 + 分享链路）、Milestone 3（Telegram WebApp + Bot 互通）。每阶段结束需通过专项回归，并更新运营脚本。

### 0.6 架构与同步策略决策

* **协议设计**：事件序列采用 64 位自增 `seqId` + SHA256 `stateHash`；状态快照包含玩家手牌哈希、倍数、当前回合信息。补帧策略：缺失事件 ≤ 20 条时增量回放，超过则发送全量快照。格式定义在 `proto/room-events.md`，开发开始前冻结。
* **断线重连与安全**：Resume Token 有效期 15 分钟，Redis 维护 `platform_sessions`，同账号多端登录策略为“最新端生效 + 旧端通知”，高风险场景触发二次验证。风控规则纳入 `services/risk/policies.ts`，上线前完成渗透测试。

### 0.7 Telegram 运营准备

* **测试账号与限流**：运营已准备 5 组测试账号与两个 Bot Token（生产/沙箱），深链参数整理在 `ops/telegram-deeplink.xlsx`。CI 集成 Telegram API 速率模拟，超限将阻塞合并。
* **自动化清单**：`ops/checklists/telegram.md` 记录了菜单、通知、群组指令的验证步骤，QA 将在每次里程碑回归时执行。

### 0.8 工程与运维

* **基础设施模板**：`infra/terraform` 目录已补齐开发/预发/生产的模块骨架（PostgreSQL、Redis、对象存储、CI 角色），并提供 `infra/scripts/plan-and-apply.sh` 统一执行入口；后续需按云厂商落地具体资源与 `.env.example` 中的凭证管理方案，同时保持 `direnv` 管理环境变量的要求。
* **CI/CD**：首轮 GitHub Actions 工作流 `ci.yml` 已在仓库 `.github/workflows/` 目录落地骨架，当前针对 `pnpm-lock.yaml` 缺失场景提供占位提示；待客户端/服务端代码落地后需补齐 `pnpm lint`、`pnpm test`、`pnpm test:e2e` 的实际执行与多平台制品打包逻辑，保持 Slack 通知策略不变。

### 0.9 体验与性能

* **资源与监控**：美术与客户端确认纹理规格（1024x1024 atlas，4 通道），音频使用 OGG + AAC 双轨。`client/src/core/metrics.ts` 将采集 FPS、内存、网络延迟并上报 Prometheus，真实设备抽样每周执行一次。
* **降级策略**：定义低端模式触发条件：WebGL 不可用或 FPS < 40 持续 10 秒 → 降级粒子数量 50%，关闭高阶特效，动画改为简化版本；弱网（RTT > 300ms）时启用“慢速提示”，延长倒计时并提示玩家。相关逻辑在 QA 用例《弱网与低端机适配》内覆盖 Telegram 桌面与移动端。

### 0.10 开发者环境

* 所有参与者已安装 Node.js 18 LTS + pnpm 8，并通过 `pnpm -v` 自检，确保 `pnpm-lock.yaml` 无漂移。
* 数据库、Redis 与环境变量配置已按照计划文档第 26 章执行完成，验证命令 `pnpm dev:server`、`pnpm dev:client:h5`、`pnpm dev:telegram` 均可启动。
* 日常流程明确：每个功能分支必须在提交前跑通 `pnpm lint`、`pnpm test`，并在主要功能点触发 `pnpm test:e2e` 以验证端到端链路。

### 0.11 文档补齐记录（2024-05-28）

为解决前期评审提出的“引用文档缺失”问题，本仓库已补充以下资料，所有成员应在开发前完成阅读：

* `docs/architecture/modules.md`：客户端、服务端与基础设施模块职责划分，提供里程碑交付映射。
* `docs/platform-auth.md`：各平台（微信/抖音小游戏、Telegram、H5）登录流程、互踢策略与风险兜底。
* `docs/contracts/openapi.yaml` 与 `docs/contracts/ws/README.md`：REST 与 WebSocket 契约初版，可直接用于代码生成与 QA Mock。
* `proto/room-events.md`：权威房间事件协议，覆盖补帧策略与错误码清单。
* `ops/telegram-deeplink.md`、`ops/checklists/telegram.md`：Telegram 深链参数与回归检查清单，支持运营与 QA 对齐。
* `infra/README.md`：Terraform 目标结构与环境划分，明确后续基础设施交付步骤。
* `docs/contracts/ws/samples/`：提供 Happy Path、重连与错误场景的 JSON Lines 样例，便于 QA/自动化脚本直接回放。
* `.github/workflows/ci.yml`：GitHub Actions 骨架，当前在缺少 `pnpm-lock.yaml` 时输出占位提示，提醒后续补齐 lint/test/e2e 与制品构建。

> 提醒：以上骨架/样例仍包含 TODO，须在 Linear 里程碑任务中追踪 Terraform 资源实现、凭证管理方案、契约代码生成脚手架与 CI 构建流程，确保在约定的 Milestone 前完成。

后续若新增/调整文档，请同步更新本节并在 PR 描述中列明，以免引用失效。

---

> 目标：基于 **Phaser 3 + TypeScript** 在「小程序（微信/抖音）」、**Telegram WebApp** 与 **H5** 同构交付一套斗地主游戏，支持 **单机（AI 对战）** 与 **联机实时对战（3 人）**，具备匹配、断线重连、观战、复盘与基础排位功能。方案聚焦工程可落地，兼顾多平台快速迭代与运维效率。

---

## 1. 产品范围与模式

* **单机模式**：本地 1v2（玩家作为农民或地主均可），三档 AI（新手/标准/高手）。
* **联机模式**：

  * 快速匹配（MMR 近似 Elo），3 人开局。
  * 自建房/房间号邀请（可选密码）。
  * 断线重连（5 分钟保护期）。
  * 观战位（最多 2 人，默认关闭，房主可开）。
* **社交/进阶**（迭代）：好友、段位、周榜、复盘分享、小程序群分享卡片、Telegram Bot 菜单/群分享与赛事订阅。
* **商业化**（留口）：皮肤、表情、体力/门票赛（遵循平台合规）。

**平台与设备**：微信/抖音小程序（小游戏运行时）+ Telegram WebApp + H5。安卓/iOS 主流机型 60FPS；低端机 30FPS 兜底；Telegram WebApp 需兼容移动端（iOS/Android App 内 WebView）与桌面端（桌面客户端/浏览器，目标 60FPS，低性能设备 30FPS）。

---

### Telegram 社交与运营集成

* **Bot 菜单体系**：规划 `/start`、`/help`、`/bind`、`/daily`、`/rank` 等指令，搭配 `setMyCommands`、`setChatMenuButton` 提供大厅、每日任务、客服入口，一键打开 WebApp 对局或复盘。
* **深链与回流**：为匹配大厅、房间邀请、复盘分享生成深链参数（`tgWebAppData` + `startapp`），在群聊/私聊消息中嵌入带文案与缩略图的邀请卡片，支持点击直达 WebApp 并带入房间号。
* **群组运营**：支持在群组内调用 Bot 快捷命令创建匹配、推送赛事/活动报名消息、订阅公告；通过 `inline query` 分享战绩或段位卡片。
* **通知策略**：结合 `answerWebAppQuery` 与 `sendMessage` 推送关键事件（体力回复、好友邀请、战报），提供用户侧开关与频控，避免干扰。
* **增长活动**：设计分享有奖、拉新返利、节日主题赛等运营位，并在后台配置活动模板，通过 Bot 向目标群体触达。

---

## 2. 技术栈与关键依赖

* **客户端**：

  * `Phaser 3`（WebGL 优先，Canvas 兜底）
  * `TypeScript` + `Vite`（H5）
  * 多平台适配层：
    * 小游戏运行时：官方 **小游戏 Canvas/WebGL 接口** + Phaser 适配（`phaser-minigame-adapter` 或等价自研桥）。
    * Telegram：基于 `Telegram Web Apps` SDK 注入启动参数、尺寸变化、主题监听，封装菜单、主按钮、支付等接口；处理移动端 WebView 安全限制与桌面端窗口缩放。
    * H5：标准浏览器能力 + PWA 壳（可迭代）。
  * 状态管理：轻量 `zustand` 或自研事件总线
  * 网络：原生 `WebSocket` 封装（小游戏 `wx.connectSocket`/抖音同等 API；Telegram WebApp 使用标准 `WebSocket`，自动注入鉴权头）
* **服务端**：

  * **Option A（推荐 MVP）**：`Node.js (18+) + Fastify`（REST）+ `ws`（WebSocket）
  * **Redis**：匹配队列、房间路由、心跳、限流
  * **PostgreSQL**：用户、匹配、牌局、回放、排行榜
  * 日志/指标：`pino` + Prometheus + Grafana
  * **Docker** 部署，Nginx 反代，Let’s Encrypt 证书
* **CI/CD**：GitHub Actions（单测、构建、自动化上传小程序体验版/H5 部署/Telegram WebApp 构建与静态资源上传）

**说明**：如需更快房间编排可选 `Colyseus`（长连房间服务器），但为控制复杂度，MVP 先用轻量自研房间管理（Redis + ws）。

---

## 3. 系统架构（逻辑与数据流）

```
[微信/抖音 小游戏客户端]
   |  WebSocket(实时) / REST(登录/配置)
[Telegram WebApp 客户端]
   |  WebSocket(实时) / REST(Bot Webhook 侧透传)
[H5 浏览器客户端]
   |  WebSocket(实时) / REST
[网关(Nginx/Cloudflare Workers)]
   |--> [Fastify API]  登录、资料、资产、回放查询、Bot 授权校验
   |--> [WS 房间服]   匹配、发牌、回合、出牌校验、结算
         |--> [Redis]  匹配池、房间表、心跳、节流
         |--> [PostgreSQL]  用户/战绩/回放/排行榜
         |--> [对象存储(可选)]  回放压缩片段、资源
         |--> [Bot Service]  Telegram 指令/菜单/客服
```

* **权威服务器**：所有**洗牌、发牌、叫分/抢地主、出牌合法性**与**结算**在服务端判定，客户端只做渲染与输入，彻底防作弊。
* **同步模型**：事件驱动（`server -> clients` 广播 **状态快照** + **增量事件**），客户端采用**确定性重放**构建 UI 状态；支持帧/动作号校验与**重同步**。
* **断线重连**：服务端保存最近 N 个事件与最新状态哈希，重连后回放到最新 tick；Telegram WebApp 断线时通过 `initData` + 重连 token 恢复，并在桌面端多标签间共享最新状态。

## 3.1 Telegram Bot 交互与回流流程

1. **启动链路**：
   * 用户点击 `/start` 或 Bot 菜单 → Bot 返回 `startapp` 深链，附带 `scene`、`roomId`、`inviteUser` 等参数。
   * WebApp 启动后读取 `initDataUnsafe.start_param`，根据场景决定跳转大厅、房间或活动页。
2. **指令体系**：
   * `/bind`：绑定账号或切换角色。
   * `/daily`：领取每日奖励，返回按钮直达 WebApp 对应页面。
   * `/rank`：查询排行榜，支持 `inline keyboard` 回调查看更多。
   * `/support`：快速发起客服对话或查看 FAQ。
3. **群聊分享**：
   * `InlineQuery` 输入房间号/战绩 ID，返回带缩略图的分享卡片。
   * Bot 监听群内 `callback_query`，校验房间容量后通知 WebApp 邀请结果。
4. **回流通知**：
   * 对局结束后触发 Webhook，Bot 根据用户订阅偏好推送战报/奖励；体力回复、好友上线等事件通过节流队列发送。
   * 支持静默推送与必达推送（重要活动），并遵守 Telegram 速率限制。
5. **运营活动**：
   * 后台配置活动模板，Bot 负责定时群发或单播；提供活动跳转参数、二维码与多语言文案。
   * 埋点记录指令调用、深链打开、跳出率，纳入 KPI 看板。

---

## 4. 玩法规则（简述）

* **牌组成**：54 张（含大小王）。
* **发牌**：每人 17 张，底牌 3 张。
* **叫分/抢地主**：按顺序叫分（1-3）或抢/不抢；最高者得地主与 3 底牌，先出牌。
* **出牌合法型**（部分）：

  * 单张、对子、三张、三带一/二、顺子（≥5）、连对（≥3 对）、飞机（含带翅）、四带二、炸弹、王炸。
* **胜负**：任一方出尽手牌即胜；计分随倍数（炸弹、春天、反春天、明牌等）变化。

---

## 5. 客户端设计（Phaser3）

### 5.1 目录结构

```
client/
  src/
    app/                # 启动、平台适配（微信/抖音/Telegram/H5）
    core/               # 事件总线、资源加载、音频
    net/                # WS 封装、协议编解码、重连
    scenes/
      BootScene.ts
      LobbyScene.ts
      MatchScene.ts     # 匹配/进度
      RoomScene.ts      # 发牌/出牌/结算主战场
      ReplayScene.ts
    ui/                 # 按钮、手牌、出牌提示、倒计时、表情
    game/               # 客户端轻量状态机、动画控制器
    ai/                 # 单机 AI 调用（纯前端）
    assets/             # 图像/音频/字体（Atlas + Spritesheets）
```

### 5.2 场景状态机

* **Boot → Lobby → Match → Room → Result → Lobby**
* 关键 UI：

  * 手牌曲线排布（贝塞尔曲线/扇形）
  * 出牌推荐/禁用提示（服务端返回合法型或本地校验）
  * 托管/取消托管
  * 表情/快捷聊天（频控）
  * 断线提示/自动重连/进度条

### 5.3 资源与性能

* 包体目标：≤ 8 MB（小程序体验良好）；Telegram/H5 首屏包控制在 5 MB 内，非关键资源按需增量加载，大资源走 CDN/云存储分批加载。
* 优先 WebGL，兼容 Canvas；纹理合图（Texture Atlas），骨骼动画（可选 spine/dragonbones 转帧序列）；Telegram WebApp 需在低端安卓 WebView 上检测 WebGL 支持，必要时降级到 Canvas。
* 动画预算：入场/出牌/炸弹/胜利/失败 五类关键动画，60FPS；低端机/弱网络时自动降低粒子数量与后效，Telegram 桌面端支持高帧率特效。

### 5.4 Telegram 桌面端键鼠与多输入适配

* **键盘映射**：支持快捷键切换手牌选中（←/→）、出牌（Enter/Space）、提示（H）、托管（T）、理牌（R），并在设置中允许自定义与冲突提示。
* **鼠标交互**：提供拖拽/框选手牌、右键取消、滚轮快速翻页浏览牌组，桌面端默认启用高精度 hover 提示与 tooltip。
* **多窗口/尺寸监听**：使用 Telegram `viewportChanged` 回调与 `window.resize` 事件，实时调整 UI 缩放、HUD 密度，确保窗口缩放、最小化/恢复时状态稳定。
* **输入法兼容**：对中文/多语言聊天框提供 IME 适配，防止快捷键截断输入；对 OS 级复制粘贴/截图粘贴进行权限判定与友好提示。
* **辅助功能**：桌面端提供可选的高对比主题、字号调整、操作日志面板，满足重度玩家与直播需求。

### 5.5 多端布局与横竖屏适配策略

* **响应式布局**：建立 3 套断点（窄 < 480px、中 480-960px、宽 > 960px），采用 `SafeArea` + 自适应 UI 宽度，角色头像、出牌区与操作面板按断点重排。
* **横竖屏切换**：移动端支持横屏主战，竖屏进入“观战 + 操作面板”模式，实时重排手牌与倒计时；小游戏采用系统横屏，Telegram/H5 允许用户自由切换并保存偏好。
* **缩放策略**：引入 `ScaleManager` 自适应等比缩放 + 关键元素锚点；桌面端允许 0.75x/1x/1.25x/1.5x 手动缩放，移动端按 DPR 自动选取资源。
* **纵向视口兼容**：针对 Telegram 内嵌 WebApp 的纵向视口，提供顶部折叠 HUD、底部半透明操作条，避免遮挡聊天窗口。
* **多设备测试矩阵**：建立平台/设备/视口组合清单（iPad 横屏、安卓折叠屏、Telegram 桌面 4:3/21:9 等），纳入 CI 自动截图与人工验收。

---

## 6. 联机协议与房间流程

### 6.1 会话与身份

* 微信/抖音：客户端 `wx.login`/`tt.login` → REST 换取 `token`（会话密钥 + 后台 JWT）→ 建立 WS → `HELLO` 握手 → 进入大厅。
* Telegram：WebApp 启动时获取 `initData`，客户端携带签名串调用 REST `POST /auth/telegram` → 通过 Bot Token 校验签名 → 签发 JWT/重连 token → 建立 WS → `HELLO`（附 `platform=telegram` 与 `tg_user_id`）。
* H5：OAuth/手机号登录获取 JWT → `HELLO`。
* 所有登录态在 REST 返回时附带 `resumeToken`（15 分钟有效，Redis + `platform_sessions` 双写），客户端在握手时回传；服务端在 `WELCOME`/`STATE_SNAP` 内同步最新 `resumeToken` 与 `expiresAt`，提前 60 秒轮换并更新 `platform_sessions.rotated_at`。

### 6.2 匹配

1. 客户端 `MATCH_JOIN{mode, mmr}` →
2. 服务器将玩家压入 Redis 有序集合（按 MMR、等待时长加权）→
3. 命中 3 人 → 建房 → 洗牌、发牌（服务端保留种子与回放）→ 广播 `ROOM_START`。

### 6.3 对局主循环

* `TURN_BEGIN{seat, remainTime}` →（倒计时）
* 玩家发送 `PLAY{cards}` 或 `PASS` → 服务器校验：

  * 牌型合法且大过上家（若需）
  * 轮转/托管/超时处理
* 轮转至下家；回合结尾触发 `SETTLE_CHECK`；有人空牌则 `GAME_END{scores, stats}`。

### 6.4 断线重连

* 客户端 `RESUME{roomId, lastSeq, resumeToken}` → 服务器校验 token（Redis + `platform_sessions`）后回放 `[lastSeq+1..now]`，附最新 `STATE_HASH` 与可能的增量 `resumeToken`，客户端对齐或全量替换。
* 令牌续期：当连接持续超过 10 分钟或 token 剩余有效期 < 60 秒，服务器通过 `RESUME_TOKEN{resumeToken, expiresAt}` 主动推送并刷新 `platform_sessions.resume_token`；客户端需立刻持久化并用于后续 `RESUME/STATE_REQ`。

### 6.5 观战与复盘（迭代）

* 观战只播公开信息；复盘读取回放事件流，支持任意回合跳转。

---

## 7. 出牌判型与核心算法

### 7.1 牌面编码

* **位图编码**：每种点数（3,4,...,2,小王,大王）用位宽计数；或 54 位 bitset 表示卡牌实例。
* **组合识别**：

  * 统计直方图（点数→出现次数），查表匹配牌型（顺子/连对/飞机用连续段扫描）。
  * 返回 `type, rankKey, length, kicker` 用于大小比较。

### 7.2 合法性校验

* 入参：`lastPlay`（为空则自由出牌）与 `candidate`；
* 规则：相同牌型且 `rankKey` 更大，炸弹/王炸特权覆盖，长度一致性校验。

### 7.3 排位 MMR 计算

* **初始值与段位映射**：所有新账号以 `MMR=1200` 起步，对应青铜段位；每 200 分切一档用于客户端展示。赛季初对历史玩家按照 `MMR = floor(oldMMR * 0.8 + 200)` 软重置，避免通胀。
* **K 系数**：
  * 前 30 局使用 `K=40` 加快收敛；
  * 正常阶段 `K=28`；
  * 高段位（MMR ≥ 2000）衰减为 `K=16`，同时若对局炸弹/春天事件触发额外 ±4 浮动。
* **胜率预估**：地主视为单人，农民取平均 MMR 并减去 60 分的合作优势偏置：

  ```text
  E_landlord = 1 / (1 + 10^((mmr_farmers - (mmr_landlord - 60)) / 400))
  E_farmers = 1 - E_landlord
  ```

* **分配规则**：
  * 地主胜利：`ΔMMR_landlord = K * (1 - E_landlord)`；农民各自 `ΔMMR_farmer = K * (0 - E_farmers) / 2`。
  * 农民胜利：`ΔMMR_landlord = K * (0 - E_landlord)`；农民各自 `ΔMMR_farmer = K * (1 - E_farmers) / 2`。
  * 托管或提前逃跑的玩家额外扣除 10 分并记录逃跑计数，连续逃跑会触发匹配惩罚（匹配池降权并加入冷却）。
* **统计落库**：`matches.mmr_snapshot`（见拓展字段）记录对局前双方 MMR，`match_players.score_change` 存储 ΔMMR；`leaderboard` 表内维护累计 MMR、胜败、连胜。服务端每日离线作业基于 `match_players(created_at)` 聚合近期走势，供排行榜与风控使用。

---

## 8. 单机 AI 设计

* **三层难度**：

  * 新手：启发式（能出最小就出，不轻易拆炸弹）。
  * 标准：启发式 + 局部搜索（1-2 步 lookahead），简易记牌推断（已出直方图）。
  * 高手：加入 MCTS-lite（随机模拟 200-500 次/回合的受限蒙特卡洛），动态风险评估（保留炸弹/大小王）。
* **通用策略要点**：

  * 叫分/抢地主：基于手牌强度评分（权重：王/2/炸弹/连牌结构）。
  * 出牌排序：优先出长链；残局留控制（王/炸弹/高对）。
  * 合作（农民）：抬队友、压地主节奏；地主：压场与拆牌平衡。
* **人味**：动作延迟（200~800ms 可变），表情/输赢反应，避免机械即时出牌。

---

## 9. 数据库模型（含约束与迁移策略）

```
users(
  id uuid PRIMARY KEY,
  openid text UNIQUE NULL,
  unionid text UNIQUE NULL,
  telegram_id bigint UNIQUE NULL,
  platform text NOT NULL,
  nickname varchar(40) NOT NULL,
  avatar text,
  mmr int DEFAULT 1200,
  created_at timestamptz DEFAULT now(),
  banned_until timestamptz
)

matches(
  id uuid PRIMARY KEY,
  room_id varchar(32) UNIQUE NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  mode varchar(16) NOT NULL,
  seed bigint NOT NULL,
  replay_ref text,
  mmr_snapshot jsonb
)

match_players(
  id bigserial PRIMARY KEY,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  seat smallint CHECK (seat BETWEEN 0 AND 2),
  role varchar(16) NOT NULL,
  score_change int NOT NULL,
  is_win boolean NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (match_id, seat),
  UNIQUE (match_id, user_id)
)

turns(
  id bigserial PRIMARY KEY,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  seq int NOT NULL,
  seat smallint NOT NULL,
  action varchar(32) NOT NULL,
  payload_json jsonb NOT NULL,
  ts timestamptz DEFAULT now(),
  UNIQUE (match_id, seq)
)

leaderboard(
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mmr int NOT NULL,
  wins int NOT NULL,
  losses int NOT NULL,
  streak int NOT NULL,
  updated_at timestamptz DEFAULT now()
),

platform_identities(
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(16) NOT NULL,
  external_id text NOT NULL,
  union_id text,
  display_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (provider, external_id),
  UNIQUE (user_id, provider)
),

platform_sessions(
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(16) NOT NULL,
  session_key text NOT NULL,
  resume_token text,
  issued_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  rotated_at timestamptz,
  UNIQUE (user_id, provider)
),

refresh_tokens(
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  issued_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  metadata jsonb
),

staff_accounts(
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  display_name text,
  role varchar(16) NOT NULL,
  created_at timestamptz DEFAULT now(),
  disabled_at timestamptz
),

login_audit(
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  platform varchar(16) NOT NULL,
  device_id text,
  ip inet,
  created_at timestamptz DEFAULT now(),
  status varchar(16) NOT NULL,
  extra jsonb
)

reports(
  id bigserial PRIMARY KEY,
  reporter_id uuid REFERENCES users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  match_id uuid REFERENCES matches(id),
  reason varchar(32) NOT NULL,
  description text,
  evidence jsonb,
  status varchar(16) DEFAULT 'pending',
  handled_by uuid REFERENCES staff_accounts(id) ON DELETE SET NULL,
  handled_at timestamptz
)

account_links(
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(16) NOT NULL,
  external_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (provider, external_id),
  UNIQUE (user_id, provider)
)
```

* 索引策略：
  * `matches(mode, started_at DESC)`、`turns(match_id, seq)`、`match_players(user_id, created_at)`（物化视图或按需触发器）提升排行榜、战绩查询效率。
  * `users(platform, created_at)`、`login_audit(user_id, created_at DESC)` 支撑风控分析。
  * `platform_sessions(resume_token)`、`refresh_tokens(token_hash)`、`platform_identities(provider, external_id)` 保障续期/吊销与登录态查找效率。
  * `reports(status, created_at)` 与 `reports(match_id)` 便于客服检索。
* 约束策略：所有外键均启用 `ON DELETE` 级联或置空，避免孤儿记录；`match_players.role` 与 `reports.reason` 采用 ENUM 或 CHECK 约束限制取值；`handled_by` 仅允许引用 `staff_accounts`。
* 回放存储：`turns` 表保留结构化事件，同时在对象存储按 `replay_ref` 落库压缩事件流，结合 `match_id` 建立 CDN 缓存。
* 数据归档：超过 90 天的 `matches`/`turns` 归档到冷存储表（`matches_archive`），通过分区表实现；活跃排行榜数据在 `leaderboard` 表内滚动更新。
* 迁移策略：MVP 阶段统一使用 **Prisma Migrate** 维护版本化迁移（生成 SQL + 校验），Knex 仅作为后续扩展选项；PR 内要求附带迁移脚本；建立 `schema_migrations` 表记录版本，CI 中运行 `pnpm db:migrate --env test` 验证；提供 `pnpm db:rollback` 允许快速回滚。
* 表职责划分：`platform_identities` 保存平台提供的原始身份标识（openid/unionid/telegram_id 等），`platform_sessions` 记录短期凭证与 `resume_token` 轮换信息；`account_links` 面向跨平台绑定（如一个用户绑定多个渠道账号），由业务操作显式写入，避免与平台原生身份冲突。

### 9.1 数据一致性与锁策略

* 房间结算流程采用事务包裹（更新 `matches`、`match_players`、`leaderboard`），并通过 `SELECT ... FOR UPDATE` 锁定对应 `leaderboard` 行，防止并发写入。
* 断线重连 token 写入 Redis，同时将关键状态（局数、MMR、连胜）落库，确保重放与排行榜同步。
* 对 `account_links` 设置唯一约束避免重复绑定，变更时触发审计日志写入 `login_audit`。

### 9.2 测试数据与种子脚本

* `pnpm db:seed`：初始化基础账号（内测账号、Bot 账号、AI 账号）、示例牌局与排行榜条目。
* 提供 `seed/fixtures/*.json`，包含示例回放、举报案例、平台会话记录，便于本地调试。
* 在 CI 中使用 `docker compose -f docker-compose.test.yml up -d` 启动 PostgreSQL/Redis，运行迁移 + 种子，确保回归场景可复现。

---

## 10. API/事件契约（详表）

### 10.1 REST 接口定义

| 路由 | 方法 | 请求体 | 响应体 | 说明 |
| --- | --- | --- | --- | --- |
| `/auth/login` | POST | `{ platform: 'wechat' \| 'tiktok' \| 'web' \| 'guest', code?: string, phone?: string, otp?: string }` | `{ token: string, refreshToken: string, resumeToken: string, expiresIn: number, refreshExpiresIn: number }` | 微信/抖音通过 `code` 置换 session，H5 支持手机号 + OTP；`platform='guest'` 返回 24 小时有效的游客身份。 |
| `/auth/migrate` | POST | `Authorization: Bearer <guest token>`, Body `{ platform: 'wechat' \| 'tiktok' \| 'web', code?: string, phone?: string, otp?: string }` | `{ token, refreshToken, resumeToken, expiresIn, refreshExpiresIn }` | 游客升级为实名账号，沿用原有战绩与资产，成功后游客 token 立即失效。 |
| `/auth/telegram` | POST | `{ initData: string, hash: string }` | `{ token, refreshToken, resumeToken, expiresIn, refreshExpiresIn, telegramId, isNew }` | 校验 Telegram 签名，`isNew=true` 触发首次绑定流程。 |
| `/auth/refresh` | POST | `{ refreshToken: string }` | `{ token, expiresIn, resumeToken, resumeExpiresIn }` | 刷新 JWT，失败返回 `401/invalid_token`。 |
| `/auth/logout` | POST | `Authorization: Bearer <token>` | `204 No Content` | 服务端吊销 refresh token，触发设备互踢。 |
| `/profile` | GET | Header `Authorization` | `{ user, stats, settings }` | 返回头像、昵称、MMR、货币、设置。 |
| `/profile` | PATCH | `{ nickname?, avatar?, settings? }` | `{ user }` | 修改资料，敏感字段（昵称）走审核队列。 |
| `/leaderboard` | GET | `?type=mmr&season=2024Q4&page=1` | `{ items: LeaderboardEntry[], nextCursor }` | 支持分页 + 赛季筛选。 |
| `/match/history` | GET | `?cursor=` | `{ matches: MatchSummary[], nextCursor }` | 返回最近牌局摘要。 |
| `/replay/:matchId` | GET | Header `Authorization` | `{ meta, eventsUrl }` | 提供回放元数据与事件下载地址。 |
| `/reports` | POST | `{ targetUserId, matchId?, reason, description?, evidenceUrls? }` | `{ id, status }` | 举报提交，写入 `reports` 表并通知客服。 |
| `/reports/:id` | PATCH | `{ status, handledBy, note? }` | `{ report }` | 客服处理入口，需角色权限。 |
| `/store/purchases` | POST | `{ sku, platformReceipt }` | `{ orderId, status }` | 预留付费接口，小游戏/Telegram 支付合规。 |

**错误码规范**：
* REST 返回 `error.code`（`AUTH_INVALID_SIGNATURE`、`MATCH_NOT_FOUND`、`RATE_LIMITED` 等）与 `message`。客户端据此提示，并在 `429` 附带 `retryAfter`。
* 所有接口要求携带 `x-platform`、`x-client-version`，版本不符返回 `426` 并提供下载地址。

### 10.2 WebSocket 事件

| 事件 | 方向 | 数据结构 | 描述 |
| --- | --- | --- | --- |
| `HELLO` | C→S | `{ token: string, platform: string, resumeToken?: string }` | 握手，支持断线重连。 |
| `WELCOME` | S→C | `{ serverTs: number, user: MinimalProfile, room?: RoomState, resumeToken: string, resumeExpiresAt: number }` | 返回服务器时间戳、房间状态与最新重连令牌。 |
| `MATCH_JOIN` | C→S | `{ mode: 'rank' \| 'casual', mmr: number }` | 加入匹配队列。 |
| `MATCH_CANCEL` | C→S | `{} 或 { reason }` | 取消匹配，服务端广播 `MATCH_CANCELLED`。 |
| `MATCH_FOUND` | S→C | `{ roomId, players: PlayerSlot[], estimatedWaitMs }` | 匹配成功，准备进入房间。 |
| `ROOM_START` | S→C | `{ roomId, landlordSeat, hand: number[], bottomCards: number[], seed: number }` | 发牌并告知地主、底牌。 |
| `TURN_BEGIN` | S→C | `{ seq, seat, remainMs, lastPlay? }` | 开始新一轮。 |
| `PLAY` | C→S | `{ seq, cards: number[], type: ComboType }` | 玩家出牌，需附客户端预判牌型。 |
| `PLAY_ACK` | S→C | `{ seq, ok: boolean, errorCode?, snapshot? }` | 服务器确认或拒绝出牌，必要时返回校正快照。 |
| `PLAY_EVT` | S→C | `{ seq, seat, cards, type, bombMultiplier }` | 广播出牌。 |
| `PASS` | C→S | `{ seq }` | 过牌。 |
| `PASS_EVT` | S→C | `{ seq, seat }` | 广播过牌。 |
| `STATE_SNAP` | S→C | `{ seq, hash, publicState, playerState?, resumeToken?, resumeExpiresAt? }` | 定期全量同步（断线重连也使用），必要时附带新的重连令牌。 |
| `STATE_REQ` | C→S | `{ roomId, sinceSeq, resumeToken }` | 客户端检测到序号缺口时主动请求补帧。 |
| `STATE_RESYNC` | S→C | `{ roomId, events: Event[], state, resumeToken?, resumeExpiresAt? }` | 针对 `STATE_REQ` 或快速补帧的响应，附增量事件与必要的令牌刷新。 |
| `GAME_END` | S→C | `{ roomId, results: PlayerResult[], mmrDelta, rewards }` | 对局结果。 |
| `RESUME` | C→S | `{ roomId, lastSeq, resumeToken }` | 断线重连请求。 |
| `RESUME_OK` | S→C | `{ roomId, events: Event[], state, resumeToken?, resumeExpiresAt? }` | 重放缺失事件并提供最新状态，可能刷新令牌。 |
| `RESUME_TOKEN` | S→C | `{ resumeToken, resumeExpiresAt }` | 在会话长连或令牌即将过期时主动续发。 |
| `KICKED` | S→C | `{ reason, platform }` | 多端互踢或违规。 |
| `PING`/`PONG` | 双向 | `{ ts }` | 心跳。 |

**事件时序约束**：
* 所有事件带 `seq` 自增，客户端本地维护 `lastAckSeq`，出现跳号时触发 `STATE_REQ{sinceSeq}`，服务器以 `STATE_RESYNC` 回传缺失事件或直接下发 `STATE_SNAP`。`STATE_REQ` 必须携带最近的 `resumeToken` 以防止恶意刷帧。
* 服务器对超时玩家在 `TURN_BEGIN.remainMs` 到期后自动发送 `AUTO_PASS_EVT` 或 `AUTO_PLAY_EVT`，并标记托管。
* 断线重连时若 `resumeToken` 过期，返回 `RESUME_FAIL{code='TOKEN_EXPIRED'}`，客户端需重新登录。

### 10.3 示例流程

1. 登录：客户端拉取平台凭据 → 调用 `/auth/*` → 存储 `token` → 建立 WS 发送 `HELLO` → 收到 `WELCOME`。
2. 匹配：`MATCH_JOIN` → 等待 `MATCH_FOUND` → 自动收到 `ROOM_START` → 进入出牌循环。
3. 复盘：客户端请求 `/replay/:matchId` → 下载事件流 → 使用 Phaser 重播并同步服务器关键帧。

### 10.4 QA 与 Mock 策略

* 使用 `docs/contracts/openapi.yaml`（待建）描述 REST 接口，结合 `prism` 或 `msw` 生成 Mock 服务，前端可在离线环境验证流程。
* WebSocket 协议以 JSON Schema（`docs/contracts/ws/*.json`）维护，CI 校验 Schema 变更并生成 TypeScript 类型。
* 提供 Postman/Insomnia 集合与示例事件流（`docs/contracts/examples/*.json`），加速联调。

---

## 11. 安全、合规与反作弊

* **洗牌**：服务端 CSPRNG（Node `crypto`），记录 `seed`；可做 **commit-reveal**（迭代）。
* **动作校验**：服务端唯一可信；客户端不得本地决定结算。
* **断线/重入**：鉴权 token + 房间令牌；重连还原。
* **合规**：小程序审核禁词、付费合规（未成年人/时长提示），隐私弹窗与授权管理；Telegram 需遵守 Bot 平台条款（禁止赌博、虚拟币合规）、提供隐私政策 URL 与客服渠道。
* **账号风控**：集中化封禁/踢线接口，支持单端/多端互斥登录与异常行为告警；Telegram 额外记录 `tg_user_id`、`username`、`language_code`，监测机器人黑名单。

### 11.1 用户举报与客服闭环

* **举报入口**：在对局内玩家头像、结算面板以及战绩页面提供举报按钮，支持作弊、辱骂、外挂等分类，必要时附聊天截图/录像引用。
* **跨平台表单**：小游戏使用原生弹窗提交，Telegram/H5 通过 WebApp 表单 + Bot `sendMessage` 兜底；所有举报写入 `reports` 表并生成工单号。
* **客服流转**：集成 Zendesk/Freshdesk 或自建客服后台，自动将举报推送至客服队列，支持状态更新、备注、处理结果。
* **客服账号管理**：客服/运营账号统一落在 `staff_accounts`，支持角色（reviewer/admin）与禁用标记；工单处理时写入 `reports.handled_by` 并记录 `handled_at`，账号删除时通过外键自动置空。
* **反馈回传**：处理完成后通过站内信、小程序模板消息或 Bot 私聊通知玩家结果，严重违规同步全平台封禁并触发风控日志。
* **数据监控**：统计举报量、平均响应时间、有效率，纳入指标看板；对高频违规账号自动触发二次审核或 AI 风控。

---

## 12. 运维与发布

* **环境**：`dev`（内网）、`staging`（体验版/Telegram 内测 Bot）、`prod`。
* **监控**：

  * 后端：CPU/内存/QPS/WS 在线、房间数量、平均局时、掉线率。
  * 客户端：初始化时长、首包、FPS、丢包率、重连次数。
* **灰度**：按版本与用户分群；热修复（资源侧）。Telegram Bot 借助 `setChatMenuButton`/`setMyCommands` 配置灰度菜单，必要时通过备用 Bot 限流。
* **自动扩缩容**：结合容器平台 HPA（CPU/连接数）触发；滚动升级确保玩家无感迁移。

---

## 13. 指标体系（核心 KPI）

* D1/D7 留存、平均对局时长、匹配成功率（< 10s 达标率）、断线率（< 3%）、作弊命中率、秒开率（< 2s）、帧率达标（60/30）。

### 13.1 数据埋点与采集规划

* **客户端埋点**：
  * Phaser 端封装 `analytics.track(event, payload)`，小游戏对接平台统计（微信 `wx.reportAnalytics`、抖音 `tt.reportAnalytics`），Telegram/H5 通过 WebSocket/HTTP 上报自研埋点服务。
  * 关键事件：启动耗时、匹配流程（进入/成功/失败）、对局阶段（叫分/出牌/结算）、断线重连、付费点击、分享/邀请、举报提交。
  * 性能指标：FPS、资源加载时长、内存峰值、包体热更新，按平台打标签。
* **服务端日志**：统一 `pino` JSON 日志，采集匹配耗时、房间事件、异常/报错、支付流水；通过 Filebeat/Fluent Bit 汇聚至 Elasticsearch 或 Loki。
* **数据管道**：埋点进入 Kafka/Redpanda，Spark/Flink 做实时清洗，落地 ClickHouse/BigQuery 供看板查询；Prometheus 抓取系统指标，Grafana 展示实时 KPI。
* **可视化与分析**：构建留存漏斗、对局转化、举报处理、渠道分析仪表盘；对 Telegram 深链参数做来源拆分，评估群分享与 Bot 推送效果。
* **隐私与合规**：遵循 GDPR/CCPA，提供数据删除/导出接口，埋点前置匿名化处理，获得用户授权后再采集。

---

## 14. 项目里程碑（6 周 MVP）

* **W1**：项目脚手架（Phaser3 + TS + 适配层）、基础 UI（大厅/匹配）、WS 通道 + 心跳。
* **W2**：判型引擎与出牌合法性；Room 流程（发牌/叫分/出牌/结算）端到端（本地回环）。
* **W3**：单机 AI（新手/标准）、动画与音效基础、断线重连。
* **W4**：匹配池 + 房间服（Redis 路由）、排行榜、战绩入库。
* **W5**：性能优化、包体与资源分发、体验版提审。
* **W6**：压测与修复、观战/复盘（基础版）、首发上线。

---

## 15. 风险与备选

* **小游戏适配**：若 Phaser 适配存在边缘兼容问题，降级 Canvas 或采用 H5 容器 + WebView 方案（体验稍逊）。
* **网络抖动**：出牌为回合制，容错较高；仍需心跳 + 超时托管与重连策略。
* **AI 难度**：高手档计算量控制在 50ms 内；超时则退化为启发式。
* **资源管控**：首包 ≤ 8MB；其余走 CDN 分片按需加载。
* **平台审核**：微信/抖音上架需准备版权声明、未成年人保护方案、内容合规文档；Telegram 需提交隐私政策、客服邮箱、Bot 描述，避免触碰支付/虚拟货币红线。
* **地区限制**：Telegram 在部分市场访问不稳定，需准备 CDN/代理加速与节点切换策略，必要时提示用户使用官方客户端网络加速。

---

## 16. UI/美术（基准规范）

* **风格**：简洁现代（避免廉价拟物），牌面高清、色弱可读性。
* **动效**：发牌（曲线抛物）、炸弹（屏幕震动 + 粒子）、连对/顺子（轨迹扫光）。
* **音效**：中文语音包（可替换）、静音模式、音量滑杆。
* **可用性**：大拇指区域主按钮、清晰出牌提示、撤销/理牌、左手模式。

### 16.1 多语言与本地化策略

* **语言覆盖**：首发支持简体中文、英语，第二阶段扩展至繁体、印尼语、西班牙语、俄语；语音包提供静音/中文/英文，后续支持社区配音。
* **文案管理**：统一使用 i18n JSON/PO 文件，结合平台原生能力（小游戏多语言、Telegram `language_code`）自动切换；对牌面文字/按钮长度预留 30% 扩展。
* **文化适配**：不同地区节日皮肤、活动文案定制；聊天敏感词库按语言维护；遵循各市场赌博/内购政策。
* **翻译流程**：接入 Lokalise/Crowdin 管理翻译版本，支持上下游校对；CI 校验缺失文案与重复 key。
* **本地化测试**：建立多语言截图 diff、语音审听流程，确保 UI 不溢出、语义准确。

---

## 17. 代码片段（接口定义示例）

```ts
// 牌型
enum Platform {
  WeChat = 'wechat',
  TikTok = 'tiktok',
  Telegram = 'telegram',
  Web = 'web',
  Guest = 'guest',
}

export type ComboType =
  | 'SINGLE' | 'PAIR' | 'TRIPLE' | 'TRIPLE_1' | 'TRIPLE_2'
  | 'STRAIGHT' | 'DOUBLES' | 'PLANE' | 'PLANE_WINGS'
  | 'FOUR_2' | 'BOMB' | 'JOKER_BOMB';

export interface Play {
  type: ComboType;
  cards: number[];      // 牌 ID
  rankKey: number;      // 比较主键
  length?: number;      // 顺子/连对长度
}

export interface WsEvent<T=any> { type: string; seq: number; data: T }

export interface AuthPayload {
  token: string;
  refreshToken: string;
  resumeToken: string;
  platform: Platform;
  expiresIn: number;
  refreshExpiresIn: number;
  resumeExpiresIn: number;
}
```

---

## 18. 跨平台新手引导与教学规划

* **总体目标**：确保首次进入的玩家在 3 分钟内完成基础操作学习并完成一局，对不同平台提供一致但不失本地化的引导体验。
* **引导阶段**：
  1. **新手欢迎**：根据平台展示欢迎页，强调操作方式（触控/键鼠）、隐私同意与音量设置。
  2. **教学对局**：触发引导场景（单机房间 + 降低 AI 难度），分步骤演示理牌、叫分、出牌、提示、托管。采用半透明遮罩与箭头说明。
  3. **任务驱动**：教学完成后解锁 3 个基础任务（完成 1 局、使用表情、添加好友/分享），奖励金币或体力，带动后续留存。
  4. **进阶提示**：达到一定局数后逐步开启高级玩法（炸弹特效、排行榜、观战），通过通知中心或 Bot 推送提醒。
* **平台差异化**：
  * **微信/抖音**：利用原生指南组件（如 `wx.showGuide`）和多阶段浮层；可选语音讲解，结合小程序订阅消息提醒回流。
  * **Telegram WebApp**：在移动端使用底部弹层提示操作区域，桌面端提供键鼠快捷键速查表；Bot 推送 `/tutorial` 指令回顾教程。
  * **H5**：提供可跳过/重播的教学模块，并在设置中保留“重新进入新手教程”入口。
* **AI 辅助**：引导局由脚本驱动的弱化 AI 配合玩家，允许随时跳过或重播；在普通对局中根据玩家失误触发即时提示（例如提示可压制的牌型）。
* **数据闭环**：埋点记录每一步引导完成率、跳出率、完成耗时，通过 A/B 测试优化文案与步骤；对 Telegram 端统计 Bot `/tutorial` 使用频次与回流率。
* **内容迭代**：预留 Markdown/JSON 配置驱动引导步骤，可由运营在后台更新；支持多语言文本与差异化语音包。

---

## 19. 资源与打包

* H5：`Vite` 多入口（H5 Demo + 小程序构建）、`rollup` treeshaking。
* 小程序：使用小游戏运行时的 `canvas` 接口与自定义构建脚本输出到 `minigame/` 目录（含资源清单 manifest）。
* Telegram：构建 Telegram 专用入口（`client/telegram/main.ts`）与 `index.html`，打包后部署至 HTTPS CDN/静态站点；通过 `tgmanifest.json`（自定义）记录版本号与资源哈希，供 Bot 发布时注入。
* 构建流水线：CI 中区分 `wechat`、`tiktok`、`telegram` 目标，分别生成 `game.json`、`ttgame.json`、`telegram/dist` 与对应上传/部署脚本（Telegram 使用 `rsync`/`scp`/云存储发布，更新 Bot `setGameScore` 与菜单链接）。
* 资源分包：核心逻辑、最小纹理进入主包；语音/皮肤放入延迟加载分包，通过 Phaser Loader 动态请求；Telegram/H5 使用 HTTP/2 分块与浏览器缓存策略（`immutable` + `content-hash`）。

---

## 20. 质量保障

* 单测：判型引擎 100% 分支覆盖、协议编解码、MMR 计算。
* 集成：端到端机器人（模拟 3 客户端）跑 10k 局回归；覆盖 Telegram WebApp 启动/重连脚本，校验 `initData` 签名与多端互踢流程。
* 压测：1k 并发房间、5k 并发连接；服务器 CPU < 70%。
* 登录与风控：覆盖多端并发登录冲突、token 续期、封禁流程的集成测试。

---

## 21. 下一步交付（v1 代码脚手架）

* `client`：可运行的 Phaser3 场景切换 + 假数据出牌演示。
* `server`：Fastify + ws 房间回环、合法性校验、基础匹配。
* 体验包：小程序体验版二维码 + Telegram WebApp 内测链接 + H5 预览地址。
* 平台差异文档：`docs/platform-auth.md`、`docs/build/minigame.md`、`docs/build/telegram.md`、`server/docs/architecture.md` 初版。

---

## 22. 多平台登录与会话补充

1. **微信 / 抖音**：
   * `wx.login` / `tt.login` → 后端调用 `code2session` / `jscode2session` → 返回 `openid`、`session_key`、`unionid`（若授权）→ 后端签发 JWT（含平台/用户 ID、刷新 token）。
   * `platform_identities` 表记录 `{user_id, provider, external_id, union_id}`，供多端绑定与实名核验；短期凭证与 `resumeToken` 保存在 `platform_sessions`，字段含 `session_key`、`issued_at`、`expires_at` 与最近一次轮换信息。
   * 游客模式：生成临时 ID，限制联机，登录后调用 `POST /auth/migrate` 迁移数据。
2. **Telegram WebApp**：
   * WebApp 启动时读取 `window.Telegram.WebApp.initData`，客户端调用 `POST /auth/telegram`，携带 `initData` 与 `hash`。
   * 后端使用 Bot Token 计算 HMAC-SHA256 校验签名，验证 `auth_date` 是否超时（如 1 分钟），再生成/绑定 `telegram_id`（`user.id`）。
   * 生成 JWT（含 `platform=telegram`、`telegram_id`、`language_code`、`username`）与刷新 token；保存 `login_audit` 日志（IP、User-Agent、WebApp 版本）。
   * 多端策略：同一 `telegram_id` 允许桌面/移动同时在线但限制同房间并发操作，冲突时后者踢出前者并给出提示；支持通过 `/logout` Bot 指令强制下线。
   * 断线重连：客户端保留 `roomId`、`lastSeq`、`resumeToken`，若 `initData` 过期需重新从 Bot 打开；服务器校验 Telegram 签名后恢复房间状态。
3. **H5 / 跨平台统一**：
   * 支持手机号验证码或三方 OAuth 登录，JWT 结构与小程序一致，`platform=web`。
   * `users` 表允许同一实体绑定多个平台标识（`openid`、`telegram_id`、`phone`），通过 `account_links` 记录映射与主账号策略。
4. **会话、续期与互踢**：
   * JWT 有效期 30 分钟，刷新 token 7 天；`refresh_tokens` 表仅存储 `token_hash` 与失效时间，刷新或注销时设置 `revoked_at` 并广播至 Redis 黑名单；Telegram 端建议在 WebApp `onEvent('mainButtonClicked')` 中触发刷新。
   * WebSocket 心跳统一 15s，服务端检测 token 即将过期时下发 `TOKEN_EXPIRE{remainMs}`，客户端调用 `/auth/refresh`。
   * 并发登录策略按平台可配置：默认仅允许 1 活跃端出牌，其余进入观战或被踢；互踢事件通过 `KICKED{reason, platform}` 通知。
5. **风控与审计**：
   * 登录日志写入 `login_audit`，记录平台、IP、设备、失败原因；Telegram 额外记录 `is_premium`、`allows_write_to_pm` 等字段以评估 Bot 能力。
   * 触发条件（短时间多次失败、可疑 IP 段、代理）时要求验证码或限流；封禁状态同步至 Bot（拒绝交互并提示客服渠道）。

---

## 23. 多平台构建、分发与分包策略

1. **项目结构**：
   * `client/minigame/`：微信/抖音入口（`game.js`、`game.json`、`project.config.json`）。
   * `client/telegram/`：Telegram WebApp 专用入口（`main.ts`、`index.html`、`telegram-theme.css`）。
   * `scripts/build-minigame.ts`、`scripts/build-telegram.ts`、`scripts/build-h5.ts` 区分输出目录，统一由 `pnpm build --filter` 调用。
2. **构建流程**：
   * CI 任务矩阵：`wechat`、`tiktok`、`telegram`、`h5`，复用共享缓存（`pnpm store`）。
   * 微信/抖音：构建产物上传至开发者工具 CLI，生成体验版二维码；配置 `miniprogram-ci`/`tt-ide-cli`。
   * Telegram：`pnpm build:telegram` → 产物上传至对象存储/静态站点（如 Cloudflare Pages/S3）→ 调用 BotFather `setdomain`/`setcommands` 更新链接 → 通过发布脚本（`scripts/release-telegram.ts`）在群内推送更新日志。
   * H5：`pnpm build:h5` → 上传至 CDN + 反向代理（Nginx），与 Telegram 共享静态资源域名时开启 `Access-Control-Allow-Origin`。
3. **资源管理与分包**：
   * 小游戏：主包 ≤ 8 MB；扩展语音、皮肤、观战资源放入分包，使用 `wx.loadSubpackage`/`tt.loadSubpackage` 管理。
   * Telegram/H5：使用 HTTP 缓存（`Cache-Control: public, max-age=31536000, immutable`），首屏预加载必要纹理，其余延迟加载；支持离线缓存（Service Worker 可选）。
   * 语音包根据平台输出差异格式（小游戏 MP3/OGG，Telegram 可追加 Opus）。
4. **平台差异适配**：
   * 小游戏：封装文件系统/分享/支付 API；处理音频手势解锁与后台托管。
   * Telegram：监听 `themeChanged`、`viewportChanged` 事件动态调整 UI；利用 `MainButton`/`BackButton`、`HapticFeedback` 增强交互；应用 `isExpanded` 判定可视区域。
   * H5：支持浏览器窗口缩放、PWA 安装提示。
5. **审核与发布**：
   * 微信/抖音：生成版本说明、隐私政策、未成年人保护文档；接入实名弹窗。
   * Telegram：准备 Bot 描述、隐私政策 URL、客服联系方式；上线前在测试群灰度，通过 BotFather `setmenubutton` 配置入口；关注 Apple/Google In-App 购买合规，避免使用 Telegram 非官方支付。

---

## 24. 房间服横向扩展与容灾机制

1. **房间路由**：
   * Redis 维护房间目录 `{roomId -> serverInstanceId}`，匹配成功后按一致性哈希挑选房间服，保证玩家消息转发到同一实例。
   * 使用 Nginx / API 网关维护 WebSocket 连接粘性，断线重连可依据目录重定向到原实例；实例下线前进行 `ROOM_MIGRATE`。
2. **状态持久化**：
   * 房间服定期将关键状态快照写入 Redis（含当前牌局、玩家信息、事件序列），支持实例崩溃后在备用节点恢复。
   * 断线重连 token 采用 Redis TTL，保证容灾后仍可校验。
3. **Redis / PostgreSQL 容灾**：
   * Redis 采用哨兵 + 主从或集群模式，配置自动故障转移；关键操作增加重试和熔断限流。
   * PostgreSQL 主备 + 流复制，定期 Base Backup；冷备在云存储保留 7 天。
4. **监控与告警**：
   * Prometheus 指标：`ws_connections`, `room_active`, `match_waiting`, `redis_latency`, `db_replication_lag`。
   * 告警：Redis 响应 > 50ms、WS 断开率 > 5%、房间恢复失败次数 > 0。
5. **扩缩容策略**：
   * 房间服按连接数/CPU 触发 HPA；上线新版本走蓝绿发布，完成房间迁移后再下线旧实例。

---

## 25. 推荐实施步骤拆解

1. **需求与架构澄清**：沉淀微信/抖音/Telegram/H5 平台登录、分包、合规、房间容灾等补充文档，冻结 MVP 范围与技术选型。
2. **基础脚手架搭建**：初始化客户端/服务端仓库结构，建立多平台构建脚本（含 Telegram）、CI 骨架。
3. **核心玩法闭环**：实现判型引擎、房间主循环、客户端基本 UI & 动画、单机 AI 新手/标准档。
4. **联机与数据层完善**：接入 Redis 匹配、PostgreSQL 持久化、断线重连与观战、回放记录。
5. **平台适配与性能优化**：完备微信/抖音/Telegram 差异适配、资源分包、性能 profiling 与降级策略。
6. **测试、监控与首发**：补齐自动化测试、压测、监控报警，配置体验版上传、Telegram WebApp 发布与 H5 部署流程，准备上线运营。

---

> 本方案面向快速落地与后续扩展。根据 v1.2 更新，已补充 Telegram 平台定位、跨平台登录会话、构建与合规策略、后端扩展容灾与实施步骤拆解，可作为开发团队启动项目的参考蓝本。

---

## 26. 本地开发环境与运行指南

### 26.1 基础工具与依赖

* **Node.js**：18 LTS（使用 `nvm` 管理版本，`nvm install 18 && nvm use 18`）。
* **pnpm**：8.x（`npm install -g pnpm@8`）。
* **Docker Desktop / Podman**：启动 PostgreSQL、Redis、MinIO（可选）等服务。
* **小程序开发工具**：微信开发者工具、抖音开发者工具；需安装 CLI 以便 CI 上传体验版。
* **Telegram Bot Token**：向 BotFather 申请，开启 WebApp 权限；本地调试使用 `https://<ngrok>/webapp`。
* **其他工具**：`redis-cli`、`pgcli`/`psql`、`mkcert`（本地 HTTPS）、`wireshark`/`mitmproxy`（调试网络）。

### 26.2 项目初始化步骤

1. 克隆仓库后执行 `pnpm install` 安装依赖。
2. 运行 `pnpm exec prisma generate` 或 `pnpm run codegen` 生成类型（根据脚手架实际命令调整）。
3. 拷贝 `.env.example` 为 `.env.local`，补充平台凭据。
4. 启动基础服务：`docker compose up -d db redis`（见下文样例）。
5. 执行 `pnpm db:migrate`、`pnpm db:seed` 初始化数据库。
6. 启动服务端：`pnpm dev:server`（Fastify + ws 房间服）。
7. 启动目标客户端入口：
   * `pnpm dev:wechat`：编译小程序包，导入微信开发者工具预览。
   * `pnpm dev:tiktok`：输出抖音小游戏目录，使用开发者工具预览。
   * `pnpm dev:telegram`：本地 HTTPS 服务器，结合 ngrok/Cloudflare Tunnel 提供公网地址。
   * `pnpm dev:h5`：Vite 本地调试。

### 26.3 外部依赖与 Docker Compose 样例

```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: ddz
      POSTGRES_PASSWORD: ddz
      POSTGRES_DB: ddz
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
  minio:
    image: minio/minio
    command: server /data --console-address :9001
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: miniopass
    ports:
      - "9000:9000"
      - "9001:9001"
volumes:
  pgdata:
```

* PostgreSQL 默认账号密码 `ddz/ddz`，可在 `.env.local` 中覆盖。
* Redis 默认无密码，本地可保持空；线上启用密码与 TLS。
* MinIO 用于回放/资源对象存储调试，可选启动。

### 26.4 环境变量清单（.env.example）

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串，例如 `postgres://ddz:ddz@localhost:5432/ddz`。 |
| `REDIS_URL` | Redis 连接串，例如 `redis://localhost:6379/0`。 |
| `JWT_SECRET` | 签发 JWT 的密钥，至少 32 字节。 |
| `SESSION_TTL_MINUTES` | WebSocket 断线重连 Token 有效期。 |
| `TELEGRAM_BOT_TOKEN` | BotFather 下发的 Token，用于签名校验与消息发送。 |
| `TELEGRAM_WEBAPP_URL` | WebApp HTTPS 地址，本地调试可用 ngrok 域名。 |
| `WECHAT_APPID` / `WECHAT_APPSECRET` | 微信小游戏凭据。 |
| `TT_APPID` / `TT_APPSECRET` | 抖音小游戏凭据。 |
| `MINIGAME_ASSET_CDN` | 静态资源 CDN 地址，无则留空。 |
| `S3_ENDPOINT` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` | MinIO/S3 存储凭据，用于回放文件上传。 |
| `LOG_LEVEL` | 默认 `info`，调试时可设为 `debug`。 |

### 26.5 常用脚本与流程

| 命令 | 作用 |
| --- | --- |
| `pnpm lint` | 使用 ESLint/Stylelint 校验前后端代码。 |
| `pnpm test` | 执行单测，需先启动 PostgreSQL/Redis。 |
| `pnpm test:e2e` | 机器人联机回归测试。 |
| `pnpm dev:server` | 后端服务（Fastify + ws）热重载。 |
| `pnpm dev:wechat` / `pnpm dev:tiktok` | 小程序构建与 watch。 |
| `pnpm dev:telegram` | Telegram WebApp 本地调试，自动注入 Bot Token。 |
| `pnpm dev:h5` | H5 Vite 开发服务器。 |
| `pnpm build:*` | 平台构建（`wechat`/`tiktok`/`telegram`/`h5`/`server`）。 |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:rollback` | 数据库迁移与种子管理。 |

### 26.6 调试技巧

* **小程序**：
  * 使用开发者工具的“性能分析”查看 FPS、Draw Call；开启“真机调试”验证音频/弱网表现。
  * 通过 `wx.setEnableDebug` 捕获运行时警告，常见问题（音频未解锁、包体过大）写入文档 FAQ。
* **Telegram WebApp**：
  * 使用桌面端/移动端调试控制台，监听 `themeChanged`、`viewportChanged` 日志；可在浏览器中模拟 `tg.initData`。
  * 建议使用 `ngrok http 5173 --host-header rewrite` 暴露本地，Bot 设置 `WEB_APP` 按钮直达。
* **服务端**：
  * Fastify `pino` 日志默认输出到 `logs/`，通过 `pnpm dev:server --inspect` 启用 Node Inspector。
  * 使用 `redis-cli monitor`、`pg_stat_activity` 排查性能瓶颈。
* **网络抓包**：
  * WebSocket 可用 `wscat`/`Chrome DevTools` 观察消息，必要时在服务端启用 `TRACE` 级别日志。
  * 模拟弱网使用 `tc qdisc` 或 Chrome 网络节流，验证断线重连逻辑。

### 26.7 常见问题与排障

| 问题 | 现象 | 解决方案 |
| --- | --- | --- |
| `pnpm install` 报错 `node-gyp` | 缺少构建工具 | 在 macOS 安装 Xcode CLI，在 Linux 安装 `build-essential`。 |
| WebSocket 握手失败 | 浏览器提示 401 | 检查 `JWT_SECRET` 是否一致、`HELLO.token` 是否过期。 |
| 小程序真机无法连接本地 | 连接超时 | 使用 ngrok/局域网 IP + HTTPS，或在路由器开启内网穿透。 |
| Telegram WebApp 空白 | 控制台报错 `initData` | 确认 Bot 设置了 WebApp 域名，或在本地注入测试 `initData`。 |
| 数据库迁移冲突 | `prisma migrate` 提示 Drift | 执行 `pnpm db:reset` 重置本地 DB，重新 apply 最新迁移。 |

### 26.8 代码规范与提交流程

* 遵循 TypeScript/ESLint + Prettier 配置，提交前执行 `pnpm lint && pnpm test`。CI 强制通过后方可合并。
* Commit Message 使用 [Conventional Commits](https://www.conventionalcommits.org/)：`feat:`、`fix:`、`docs:`、`chore:` 等。
* PR 模版需包含：变更摘要、测试截图/日志、影响面、回滚策略；引用相关任务编号。
* 对涉及协议/数据库变更的 PR，必须同步更新 `docs/contracts` 与迁移脚本。

---

## 27. 多端调试与构建流程指南

### 27.1 微信/抖音小程序

1. 执行 `pnpm dev:wechat`/`pnpm dev:tiktok` 输出到 `dist/minigame` 目录。
2. 打开对应开发者工具导入项目，启用“本地设置”>“不校验合法域名”用于本地联调。
3. 配置请求白名单与 WebSocket 域名，使用内网穿透域名；真机调试时检查 `wx.getSystemInfo` 返回的性能指标。
4. 构建体验版：`pnpm build:wechat` 后通过 CLI `miniprogram-ci upload` 上传；抖音使用 `tt-ide-cli upload`。
5. 审核包要求附上隐私弹窗截图、未成年人保护说明。

### 27.2 Telegram WebApp

1. `pnpm dev:telegram` 启动本地 HTTPS（Vite 配合 `mkcert` 证书）。
2. 通过 ngrok/Cloudflare Tunnel 映射公网地址，在 BotFather `setdomain`、`setmenubutton` 指向该地址。
3. 使用 `tg-cli`/`curl` 模拟调用 `/auth/telegram`，验证签名流程；桌面端/移动端分别测试 `viewportChanged`。
4. 构建发布：`pnpm build:telegram` → 上传至 CDN/S3 → 更新 `tgmanifest.json` 版本 → Bot 推送更新。

### 27.3 H5/PWA

1. `pnpm dev:h5` 启动本地 Vite，结合浏览器 DevTools 模拟多设备。
2. `pnpm build:h5` 生成生产包，部署至 Nginx/Cloudflare Pages；配置 `service-worker.js` 以支持离线与缓存更新提示。
3. 使用 Lighthouse/PageSpeed 评估首屏性能、PWA 指标。

### 27.4 CI/CD 骨架

* GitHub Actions 工作流：
  * `lint-test.yml`：安装 pnpm、还原依赖、启动服务容器、执行 `pnpm lint`、`pnpm test`、`pnpm test:e2e`。
  * `build-deploy.yml`：矩阵构建多平台产物，使用缓存；完成后触发部署（小游戏体验版、Telegram CDN、H5 静态站点）。
* 环境变量通过 GitHub Secrets 管理，敏感凭据（Bot Token、AppID、S3 密钥）仅在部署作业解密。
* 制定回滚流程：构建保留最近 5 个版本，Telegram/H5 支持一键回滚 CDN，小游戏通过“版本回退”功能恢复。
