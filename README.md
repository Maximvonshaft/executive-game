# Practice Card Games — Phase 1 PVP Slice

本仓库在 Phase 0 登录与安全基线之上，完成了匹配大厅、房间管理与五子棋实时对局闭环，对应《施工图》中的 Phase 1。

## 功能概览
- **Telegram 登录校验**：验证 `initData` HMAC，生成 HS256 JWT 会话令牌。
- **大厅与匹配**：`/api/games` 列出可玩游戏，`/api/match/start|cancel` 提供排队/取消，自动分配房间。
- **房间与回流**：`/api/rooms` 查询当前房间，`/api/rooms/join` 获取快照与事件序列，用于重连补偿。
- **实时对战 WebSocket**：`/ws?token=<JWT>` 下行 `room_state`、`match_started`、`action_applied`、`match_result` 等事件，支持断线重连与心跳。
- **五子棋引擎**：纯函数实现 15x15 自由连五，事件溯源日志可复盘整局。
- **文档交付**：`openapi.yaml`、`docs/ws-contract.md`、`docs/engine-gomoku.md`、更新后的错误码字典等。

## 快速开始
1. 复制 `.env.example` 为 `.env` 并填入密钥：
   ```bash
   cp .env.example .env
   export $(cat .env | xargs) # 或在 CI/CD 中注入
   ```
2. 启动服务：
   ```bash
   npm run start
   ```
3. 调用登录接口获取 JWT：
   ```bash
   curl -X POST http://localhost:3000/api/auth/telegram \
     -H 'Content-Type: application/json' \
     -d '{"initData":"<telegram-init-data>"}'
   ```
4. 读取大厅与发起匹配：
   ```bash
   curl http://localhost:3000/api/games
   curl -X POST http://localhost:3000/api/match/start \
     -H 'Authorization: Bearer <jwt>' \
     -H 'Content-Type: application/json' \
     -d '{"gameId":"gomoku"}'
   ```
5. WebSocket 订阅房间：
   ```text
   ws://localhost:3000/ws?token=<jwt>
   ```

## 脚本
| 命令 | 说明 |
| --- | --- |
| `npm run start` | 启动 HTTP + WebSocket 服务 |
| `npm run dev` | 同上（预留未来热重载） |
| `npm run lint` | 自研轻量格式检查，覆盖所有文本文件 |
| `npm run test` | 使用 Node 内置 `node:test` 模块运行单元测试 |

## 目录结构
```
├── docs/                   # 契约与指南（错误码、WS、引擎说明）
├── src/
│   ├── config/             # 环境与密钥管理
│   ├── errors/             # 错误码定义
│   ├── engines/            # 游戏引擎（gomoku）
│   ├── realtime/           # WebSocket 握手与事件分发
│   ├── services/           # 业务逻辑（Auth/匹配/房间）
│   ├── utils/              # JWT/Telegram/鉴权工具函数
│   └── server.js           # HTTP Server 入口
├── test/                   # 单元与集成测试
├── scripts/lint.js         # 轻量 Lint 工具
├── openapi.yaml            # HTTP 契约
└── docs/*.md               # 指南文档
```

## 安全与合规建议
- Bot Token、JWT Secret 必须通过 CI/CD Secret Manager 注入，严禁硬编码。
- WebSocket 仍建议部署在 HTTPS/WSS 之下，并搭配反向代理的速率限制。
- 密钥轮换流程：每 90 天更新一次 `JWT_SECRET`，使用双写策略（旧新密钥并存）平滑迁移。

## 阶段路线图
- Phase 1：已交付大厅→匹配→房间→五子棋闭环。
- Phase 2+：新增多种游戏引擎、完善大厅体验。
