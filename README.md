# Practice Card Games — Phase 0 Foundations

本仓库实现了 Telegram Mini App 的基础设施，包括登录、配置管理、风格规范及移动端适配指南，对应《施工图》中的 Phase 0。

## 功能概览
- **Telegram 登录校验**：验证 `initData` HMAC，生成 HS256 JWT 会话令牌。
- **环境配置**：支持 `development` / `staging` / `production`，通过环境变量注入密钥。
- **安全基线**：统一错误码字典、HTTP 安全头、健康检查接口。
- **文档交付**：`openapi.yaml`、移动端适配指南、视觉 Style Guide、错误码文档。

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
3. 调用登录接口：
   ```bash
   curl -X POST http://localhost:3000/api/auth/telegram \
     -H 'Content-Type: application/json' \
     -d '{"initData":"<telegram-init-data>"}'
   ```

## 脚本
| 命令 | 说明 |
| --- | --- |
| `npm run start` | 启动 HTTP 服务 |
| `npm run dev` | 同上（预留未来热重载） |
| `npm run lint` | 自研轻量格式检查，覆盖所有文本文件 |
| `npm run test` | 使用 Node 内置 `node:test` 模块运行单元测试 |

## 目录结构
```
├── docs/                   # Phase 0 文档产物
├── src/
│   ├── config/             # 环境与密钥管理
│   ├── errors/             # 错误码定义
│   ├── services/           # 业务逻辑（Telegram 登录）
│   ├── utils/              # JWT/Telegram 工具函数
│   └── server.js           # HTTP Server 入口
├── test/                   # 单元测试
├── scripts/lint.js         # 轻量 Lint 工具
├── openapi.yaml            # Auth API 契约
└── docs/*.md               # 指南文档
```

## 安全与合规建议
- Bot Token、JWT Secret 必须通过 CI/CD Secret Manager 注入，严禁硬编码。
- 建议在生产环境启用 HTTPS 终端节点及反向代理层的速率限制。
- 密钥轮换流程：每 90 天更新一次 `JWT_SECRET`，使用双写策略（旧新密钥并存）平滑迁移。

## 后续阶段入口
- Phase 1：基于此基础扩展匹配 / 对战 WebSocket。
- Phase 2+：新增多游戏引擎适配与观战、AI 等特性。
