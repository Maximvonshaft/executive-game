# Observability — 指标、日志与追踪基线（Phase 6）

> 目标：通过统一的遥测管道覆盖核心实时流程，支撑 SLO 观测、异常定位与容量规划。

## 采集管道

- **OpenTelemetry 风格埋点**：`src/services/observability.js` 暴露 `recordHistogram`、`addLog` 与 `startSpan` 三个原语，服务端所有关键路径均通过该模块上报。
- **日志**：按照 `info`、`warn`、`debug` 级别记录房间事件、幂等命中与帧异常，便于在 Grafana/ELK 中筛选。
- **指标**：统一以毫秒为单位采集直方图（Histogram），按游戏类型、玩家 ID 等维度扩展属性。
- **追踪（Trace）**：匹配、房间动作等链路通过 `startSpan` 记录起止时间及异常事件，可接入 Tempo/Jaeger。

## 指标明细

| 名称 | 说明 | 标签 | 备注 |
| --- | --- | --- | --- |
| `match_wait_ms` | 从房间创建或匹配票据生成到对局开始的等待时长 | `gameId` | 匹配服务与手动开局均覆盖，幂等去重。 |
| `match_duration_ms` | 对局从开局到结算的耗时 | `gameId` | 仅在成功结束时记录。 |
| `ws_latency_ms` | 客户端 `ping` → 服务端 `pong` 的往返时延 | `playerId` | 支持客户端时间戳或默认 0。 |
| `disconnect_recovery_ms` | 客户端通过 `request_state` 补齐事件的时间跨度 | `roomId`、`eventCount` | 用于监控断线重放健康度。 |

> 统计值包含 `count`、`sum`、`average`、`p50`、`p95`，可直接导入仪表板。

## 追踪切面

- **匹配服务**：`matchmaker.start` span 覆盖票据复用、房间生成与匹配耗时。
- **房间动作**：`room.apply_action` span 记录客户端帧信息、引擎校验结果及异常。
- **事件流**：`room_event` 日志统一由 `RoomManager.emitRoomEvent` 输出，具备房间 ID 与序号。

## 可观测性复位

测试环境通过 `withServer` 钩子调用 `observability.reset()`，确保每个用例可获取干净的快照。

