# 多平台登录与鉴权指引

本文补充 Phaser3-DDZ 项目在微信/抖音小游戏、Telegram WebApp 与标准 H5 环境下的账号体系、鉴权流程与异常兜底策略，解决方案已与服务端契约 (`docs/contracts/openapi.yaml`) 对齐。

## 1. 总体原则

1. **统一账号体系**：所有平台账号最终映射到 PostgreSQL `users` 表，以 `uid` 为唯一主键，平台侧标识通过 `user_identities` 表维护（详见 OpenAPI 契约）。
2. **一次鉴权，多端共享**：用户登录后获取的 `accessToken` 与 `refreshToken` 均可在不同设备复用，Redis 维护 `platform_sessions` 确保互踢规则。
3. **安全优先**：所有签名/票据验证在服务端完成，客户端仅收集必要参数，避免泄露密钥。

## 2. 微信小游戏

| 步骤 | 客户端动作 | 服务端接口 | 说明 |
| --- | --- | --- | --- |
| 1 | 调用 `wx.login` 获取临时 `code` | `POST /auth/wechat-mini/login` | 客户端只上传 `code` + `platform` + 设备信息 |
| 2 | 监听 `wx.getUserInfo`（可选） | 同上 | 若平台要求明示授权，将用户昵称/头像写入用户资料 |
| 3 | 接收服务端返回的 `accessToken`、`refreshToken`、`uid` | - | 存储在小游戏本地存储，构造 WebSocket 鉴权头 |
| 4 | 心跳续期 | `POST /auth/token/refresh` | 每 25 分钟刷新；Redis 记录最新设备信息 |

异常兜底：`code` 过期时重新发起 `wx.login`；当 `session_key` 失效时强制用户重新登录。

## 3. 抖音小游戏

流程与微信类似，差异在于 `tt.login` 票据字段不同，同时需关注抖音的用户隐私合规。

| 步骤 | 客户端动作 | 服务端接口 |
| --- | --- | --- |
| 1 | 调用 `tt.login` 获取 `code` 与 `anonymous_code` | `POST /auth/bytedance-mini/login` |
| 2 | 可选的 `tt.getUserProfile` | 同上 |
| 3 | 服务端换取 session，返回统一 Token | - |

异常兜底：当 `anonymous_code` 无效（新设备首登）时需重试 `tt.login`；抖音平台审核要求声明 SDK 的使用目的。

## 4. Telegram WebApp

1. 在 Bot 启动 WebApp 时，携带 `initData`。客户端需将完整字符串透传给服务端。
2. 服务端 `POST /auth/telegram/webapp` 校验 `hash` 与时间戳，签名密钥为 Bot Token。
3. 校验通过后返回统一 Token。若用户尚未绑定，将自动创建账号并写入 `user_identities`。
4. 若 WebApp 处于群组会话，需同时记录 `chat_instance`，以便回流消息定位。

异常兜底：`initData` 仅 24 小时有效，过期后需引导用户重新通过 Bot 打开 WebApp；当用户拒绝授权时展示提示并提供帮助入口。

## 5. 标准 H5

* 使用手机号/邮箱 + 密码或第三方 OAuth（Apple、Google）。
* 登录接口：`POST /auth/basic/login`；注册接口：`POST /auth/basic/register`。
* H5 端可开启「记住我」，通过 `refreshToken` 刷新，遵循相同互踢策略。

## 6. 会话与互踢策略

* Redis Key：`platform_sessions:{uid}`，值包含 `platform`、`deviceId`、`updatedAt`。
* 新会话上线时，若同平台已有登录，则旧会话收到 `FORCE_LOGOUT` WebSocket 事件（详见 `proto/room-events.md`）。
* 支持 Telegram/H5 并行；小游戏端与 H5/Telegram 互斥，避免共享账号引发审核风险。

## 7. 风险控制与合规

* 登录失败超过 5 次触发验证码或冷却。
* Telegram/H5 登录需支持 GDPR 数据导出/删除请求。
* 小游戏遵守平台审核规范：启动时展示合规弹窗，收集的数据仅用于游戏服务。

## 8. 开发排期建议

| 任务 | 所属里程碑 | 负责人 | 备注 |
| --- | --- | --- | --- |
| 微信/抖音登录 API | Milestone 1 | Server 团队 | 依赖开放平台注册与审核 |
| Telegram WebApp 鉴权 | Milestone 2 | Server + Bot | 需完成 Bot Token 申请与回流文案 |
| H5 基础账号 | Milestone 1 | Server | OAuth 可后置 |
| 会话互踢通知 | Milestone 2 | Client + Server | 实现 `FORCE_LOGOUT` 事件及前端提示 |

更新节奏：任意平台登录流程调整均需更新本文件和 OpenAPI 契约，并通知 QA 更新自动化脚本。

最后更新：2024-05-28。
