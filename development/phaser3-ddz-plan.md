# Phaser3 多平台斗地主（单机 + 联机）开发方案 v1.2

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

---

## 6. 联机协议与房间流程

### 6.1 会话与身份

* 微信/抖音：客户端 `wx.login`/`tt.login` → REST 换取 `token`（会话密钥 + 后台 JWT）→ 建立 WS → `HELLO` 握手 → 进入大厅。
* Telegram：WebApp 启动时获取 `initData`，客户端携带签名串调用 REST `POST /auth/telegram` → 通过 Bot Token 校验签名 → 签发 JWT/重连 token → 建立 WS → `HELLO`（附 `platform=telegram` 与 `tg_user_id`）。
* H5：OAuth/手机号登录获取 JWT → `HELLO`。

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

* 客户端 `RESUME{roomId, lastSeq}` → 服务器回放 `[lastSeq+1..now]`，附最新 `STATE_HASH`，客户端对齐或全量替换。

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

## 9. 数据库模型（简化）

```
users(id, openid, unionid, telegram_id, platform, nickname, avatar, mmr, created_at, banned_until)
matches(id, room_id, started_at, ended_at, mode, seed, replay_ref)
match_players(match_id, user_id, seat, role, score_change, is_win)
turns(id, match_id, seq, seat, action, payload_json, ts)
leaderboard(user_id, mmr, wins, losses, streak)
platform_sessions(id, user_id, platform, session_key, expires_at)
login_audit(id, user_id, platform, device_id, ip, created_at, status)
```

* 回放存储：`turns` 或压缩事件流写对象存储（按 `replay_ref`）

---

## 10. API/事件（摘要）

### REST

* `POST /auth/login` → `{token}`
* `POST /auth/telegram` → `{token, refreshToken}`
* `POST /auth/refresh` → `{token}`
* `POST /auth/logout`
* `GET /profile` → 用户资料/资产
* `GET /leaderboard?page=1`
* `GET /replay/{matchId}`

### WebSocket（JSON 行协议）

* `HELLO{token}` → `WELCOME{serverTs}`
* `MATCH_JOIN{mode}` / `MATCH_CANCEL`
* `ROOM_START{roomId, players, hand, landlordSeat, bottomCards}`
* `TURN_BEGIN{seat, remainTime}`
* `PLAY_ACK{ok, err?}` / `PLAY_EVT{seat, cards, type}`
* `PASS_EVT{seat}`
* `STATE_SNAP{hash, publicState}`（定期）
* `GAME_END{scores, stats, mmrDelta}`
* `RECONNECT_DENY{reason}`
* `PING` / `PONG`

**防刷**：客户端发送频控 + 服务器动作去抖（同 seq 幂等）。

---

## 11. 安全、合规与反作弊

* **洗牌**：服务端 CSPRNG（Node `crypto`），记录 `seed`；可做 **commit-reveal**（迭代）。
* **动作校验**：服务端唯一可信；客户端不得本地决定结算。
* **断线/重入**：鉴权 token + 房间令牌；重连还原。
* **合规**：小程序审核禁词、付费合规（未成年人/时长提示），隐私弹窗与授权管理；Telegram 需遵守 Bot 平台条款（禁止赌博、虚拟币合规）、提供隐私政策 URL 与客服渠道。
* **账号风控**：集中化封禁/踢线接口，支持单端/多端互斥登录与异常行为告警；Telegram 额外记录 `tg_user_id`、`username`、`language_code`，监测机器人黑名单。

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

---

## 17. 代码片段（接口定义示例）

```ts
// 牌型
enum Platform {
  WeChat = 'wechat',
  TikTok = 'tiktok',
  Telegram = 'telegram',
  Guest = 'guest'
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
  platform: Platform;
  expiresIn: number;
}
```

---

## 18. 资源与打包

* H5：`Vite` 多入口（H5 Demo + 小程序构建）、`rollup` treeshaking。
* 小程序：使用小游戏运行时的 `canvas` 接口与自定义构建脚本输出到 `minigame/` 目录（含资源清单 manifest）。
* Telegram：构建 Telegram 专用入口（`client/telegram/main.ts`）与 `index.html`，打包后部署至 HTTPS CDN/静态站点；通过 `tgmanifest.json`（自定义）记录版本号与资源哈希，供 Bot 发布时注入。
* 构建流水线：CI 中区分 `wechat`、`tiktok`、`telegram` 目标，分别生成 `game.json`、`ttgame.json`、`telegram/dist` 与对应上传/部署脚本（Telegram 使用 `rsync`/`scp`/云存储发布，更新 Bot `setGameScore` 与菜单链接）。
* 资源分包：核心逻辑、最小纹理进入主包；语音/皮肤放入延迟加载分包，通过 Phaser Loader 动态请求；Telegram/H5 使用 HTTP/2 分块与浏览器缓存策略（`immutable` + `content-hash`）。

---

## 19. 质量保障

* 单测：判型引擎 100% 分支覆盖、协议编解码、MMR 计算。
* 集成：端到端机器人（模拟 3 客户端）跑 10k 局回归；覆盖 Telegram WebApp 启动/重连脚本，校验 `initData` 签名与多端互踢流程。
* 压测：1k 并发房间、5k 并发连接；服务器 CPU < 70%。
* 登录与风控：覆盖多端并发登录冲突、token 续期、封禁流程的集成测试。

---

## 20. 下一步交付（v1 代码脚手架）

* `client`：可运行的 Phaser3 场景切换 + 假数据出牌演示。
* `server`：Fastify + ws 房间回环、合法性校验、基础匹配。
* 体验包：小程序体验版二维码 + Telegram WebApp 内测链接 + H5 预览地址。
* 平台差异文档：`docs/platform-auth.md`、`docs/build/minigame.md`、`docs/build/telegram.md`、`server/docs/architecture.md` 初版。

---

## 21. 多平台登录与会话补充

1. **微信 / 抖音**：
   * `wx.login` / `tt.login` → 后端调用 `code2session` / `jscode2session` → 返回 `openid`、`session_key`、`unionid`（若授权）→ 后端签发 JWT（含平台/用户 ID、刷新 token）。
   * `platform_identity` 表记录 `{user_id, platform, openid, unionid, session_key}`，定期刷新 `session_key` 并写入 `platform_sessions`。
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
   * JWT 有效期 30 分钟，刷新 token 7 天；Telegram 端建议在 WebApp `onEvent('mainButtonClicked')` 中触发刷新。
   * WebSocket 心跳统一 15s，服务端检测 token 即将过期时下发 `TOKEN_EXPIRE{remainMs}`，客户端调用 `/auth/refresh`。
   * 并发登录策略按平台可配置：默认仅允许 1 活跃端出牌，其余进入观战或被踢；互踢事件通过 `KICKED{reason, platform}` 通知。
5. **风控与审计**：
   * 登录日志写入 `login_audit`，记录平台、IP、设备、失败原因；Telegram 额外记录 `is_premium`、`allows_write_to_pm` 等字段以评估 Bot 能力。
   * 触发条件（短时间多次失败、可疑 IP 段、代理）时要求验证码或限流；封禁状态同步至 Bot（拒绝交互并提示客服渠道）。

---

## 22. 多平台构建、分发与分包策略

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

## 23. 房间服横向扩展与容灾机制

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

## 24. 推荐实施步骤拆解

1. **需求与架构澄清**：沉淀微信/抖音/Telegram/H5 平台登录、分包、合规、房间容灾等补充文档，冻结 MVP 范围与技术选型。
2. **基础脚手架搭建**：初始化客户端/服务端仓库结构，建立多平台构建脚本（含 Telegram）、CI 骨架。
3. **核心玩法闭环**：实现判型引擎、房间主循环、客户端基本 UI & 动画、单机 AI 新手/标准档。
4. **联机与数据层完善**：接入 Redis 匹配、PostgreSQL 持久化、断线重连与观战、回放记录。
5. **平台适配与性能优化**：完备微信/抖音/Telegram 差异适配、资源分包、性能 profiling 与降级策略。
6. **测试、监控与首发**：补齐自动化测试、压测、监控报警，配置体验版上传、Telegram WebApp 发布与 H5 部署流程，准备上线运营。

---

> 本方案面向快速落地与后续扩展。根据 v1.2 更新，已补充 Telegram 平台定位、跨平台登录会话、构建与合规策略、后端扩展容灾与实施步骤拆解，可作为开发团队启动项目的参考蓝本。
