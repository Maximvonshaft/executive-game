# Security & Anti-Cheat — Phase 6 强化

> 目标：以服务端权威判定为中心，补齐幂等等价、帧序校验与异常审计，支撑规模化对战的风控与溯源需求。

## 核心能力

### 1. 帧序校验（Frame Sequence Guard）
- WebSocket `play_action` 允许客户端携带 `clientFrame`。
- `RoomManager.applyPlayerAction` 会对照服务器维护的上一帧序号：
  - **重复帧** → `ACTION_FRAME_REPLAYED`，记录指纹并广播拒绝事件。
  - **跳跃帧** → `ACTION_FRAME_OUT_OF_SYNC`，阻止越权操作。
- 所有异常经 `antiCheatService.recordAnomaly` 生成 SHA-256 指纹，便于风控归档。

### 2. 幂等键（Idempotency Key）
- `play_action` 支持 `idempotencyKey`，服务端为每个玩家维护已消费键集合。
- 重复请求不会污染棋盘，返回 `ACTION_DUPLICATE` 并写入低等级异常日志，容忍弱网络重试。

### 3. 审计与回放
- `auditService` 基于事件哈希链（`prevHash` → `hash`）记录房间全量事件。
- 新增 `/internal/replay/{roomId}` 只读接口，返回玩家、结果、事件及完整链路校验信息。
- 任何篡改都会破坏哈希链，便于快速定位。

### 4. 指纹归档
- `antiCheatService.listRecent()` 提供最近异常摘要，供报警与人工复核使用。
- 指纹（Fingerprint）长度 64，跨实例稳定，可回溯到具体房间/玩家。

## 集成点

- WebSocket 网关：注入幂等键、帧序参数并在 `ping` / `request_state` 阶段提供可观测指标。
- `RoomManager.emitRoomEvent`：统一输出事件日志并同步到审计服务。
- `tests/support/server.js`：在单元测试启动前重置 Anti-Cheat、Audit、Telemetry 状态。

## 与客户端的兼容性

- 未携带 `clientFrame` 或 `idempotencyKey` 的旧客户端仍然兼容（服务端默认放行）。
- 建议客户端逐步接入帧序与幂等键，以享受更好的断线重放与重试体验。

