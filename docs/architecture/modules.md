# Phaser3-DDZ 架构模块总览

本文件为 Phaser3 多平台斗地主项目的公共架构补充，梳理各服务/子系统的职责边界、依赖与交付物，作为后续实现与评审的依据。所有内容应与 Confluence《Phaser3-DDZ-架构同步》保持一致，每次架构调整需同步更新。

## 1. 客户端侧模块

| 模块 | 代码目录 | 关键职责 | 主要依赖 |
| --- | --- | --- | --- |
| **游戏壳层** | `client/src/app/` | Phaser 游戏实例创建、Router、场景注册、平台 Capability 检测 | Phaser 3、平台适配层 |
| **UI 场景** | `client/src/scenes/` | 登录大厅、匹配大厅、房间对局、结算、观战、设置、弱网提示等场景实现 | Phaser UI 组件、状态管理、i18n |
| **状态管理** | `client/src/state/` | 房间状态、玩家手牌、回合信息、动画调度，支持快照重播 | Zustand、自研事件总线 |
| **网络层** | `client/src/net/` | WebSocket 连接管理、重连策略、事件派发、协议编解码 | `ws`/平台原生 Socket、`proto/room-events.md` | 
| **平台适配** | `client/src/platform/` | 微信/抖音/Telegram/H5 能力封装（登录、分享、窗口、支付） | 各平台 SDK、`docs/platform-auth.md` |
| **监控埋点** | `client/src/core/metrics.ts` | 帧率、内存、网络延迟采集与上报 | Web Performance API、Prometheus Push Gateway |
| **资源加载** | `client/src/assets/` | 纹理图集、音频、字体、语言包等资源 | Phaser Loader、平台资源管理 |

> **备注**：`client/src/core/metrics.ts` 初版将在脚手架搭建时一并落地；若未准备好 Prometheus 入口，应提供本地日志降级实现。

## 2. 服务端模块

| 模块 | 代码目录 | 关键职责 | 主要依赖 |
| --- | --- | --- | --- |
| **API 服务** | `server/api/` | RESTful 接口（登录、资料、战绩、活动配置等），OpenAPI 契约位于 `docs/contracts/openapi.yaml` | Fastify、PostgreSQL |
| **房间服务** | `server/rooms/` | 匹配、房间生命周期、发牌校验、出牌合法性、结算、观战广播 | `ws`、Redis、PostgreSQL |
| **匹配服务** | `server/matchmaking/` | 快速匹配、房间号匹配、Elo/MMR 计算、扩散机制 | Redis、有序集合 |
| **风控服务** | `server/risk/` | 安全检测、举报、违规判罚、二次验证、速率限制 | Redis、PostgreSQL、外部风控接口 |
| **运营服务** | `server/ops/` | 活动模板、奖励发放、Push 通知、战报生成 | PostgreSQL、对象存储 |
| **Bot 网关** | `server/bot/` | Telegram Bot webhook、命令处理、WebApp 深链 | grammY、`ops/telegram-deeplink.md` |

## 3. 数据与基础设施

* **数据库**：PostgreSQL 15，表结构参见 `docs/contracts/openapi.yaml#/components/schemas` 中的实体说明；索引策略在 `infra/README.md`。
* **缓存**：Redis 7，实例划分 `cache`（登录态/配置）与 `realtime`（房间与匹配）。
* **对象存储**：MinIO/S3，用于回放与资源托管。
* **CI/CD**：GitHub Actions，工作流定义将在仓库 `./.github/workflows/` 目录维护；本文件主要追踪依赖。

## 4. 交付物与里程碑映射

| 里程碑 | 核心交付 | 依赖文档 |
| --- | --- | --- |
| Milestone 1 | H5 客户端壳层、AI 单机、基础房间服务 | 本文件、`docs/contracts/openapi.yaml`、`proto/room-events.md` |
| Milestone 2 | 小游戏适配、匹配队列、断线重连 | `docs/platform-auth.md`、`ops/telegram-deeplink.md` |
| Milestone 3 | Telegram WebApp、Bot 回流、活动配置 | `ops/telegram-deeplink.md`、`infra/README.md` |

## 5. 更新流程

1. 任何模块职责或依赖发生变化，提交者需：
   * 更新对应代码目录的 `README` 或内嵌注释；
   * 在本文件追加/修改记录；
   * 在 PR 中关联需求或问题编号。
2. 架构评审后，由架构师确认文档同步，QA 需在回归 Checklist 中引用最新版本。

---

最后更新：2024-05-28。
