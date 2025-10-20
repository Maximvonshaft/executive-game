# WebSocket 契约（Phase 1 — 五子棋闭环）

> 基础地址：`wss://{env}.api.practice-card.games/ws?token=<JWT>`
>
> - 传入的 JWT 与 HTTP Bearer 一致，必填；校验失败服务端会以 `4401 TOKEN_INVALID` 关闭连接。
> - 消息统一使用 JSON，顶层结构 `{ "event": "ready", "data": { ... } }`（客户端 → 服务端）或 `{ "type": "turn_started", "data": { ... } }`（服务端 → 客户端）。
> - 所有响应均带上最新 `sequence`，客户端可据此做幂等与补偿。

## 客户端事件

| 事件 | data | 说明 |
| --- | --- | --- |
| `join_room` | `{ roomId: string }` | 加入/恢复指定房间，收到最新 `room_state`。|
| `ready` | `{ roomId: string }` | 标记当前玩家已准备，全部准备后进入对局并下发 `turn_started`。|
| `play_action` | `{ roomId: string, x: number, y: number }` | 在棋盘坐标 `(x, y)` 落子。错误时返回 `action_rejected`。|
| `request_state` | `{ roomId: string }` | 主动拉取当前房间状态（断线重连使用）。|
| `ping` | `{}` | 心跳，服务端返回 `pong`，含 `ts` 毫秒时间戳。|

## 服务端事件

| 类型 | data | 说明 |
| --- | --- | --- |
| `connection_ack` | `{ playerId: string }` | 连接建立成功。|
| `match_started` | `{ matchId: string, roomId: string, gameId: string, players: PlayerSeat[] }` | 匹配完成，通知双方房间信息。|
| `room_state` | `{ roomId: string, state: RoomState }` | 房间全量状态（ready、request_state、断线恢复均会推送）。|
| `turn_started` | `{ roomId: string, playerId: string }` | 指示下一个行动玩家。|
| `action_applied` | `{ roomId: string, move: GomokuMove, sequence: number, engine: GomokuEngineState }` | 落子成功广播，附带最新序列和引擎快照。|
| `action_rejected` | `{ reason: string, message: string }` | 行为失败（越界、越权等）。|
| `match_result` | `{ roomId: string, result: { type: 'win' | 'draw', playerId?: string, winningLine?: Coordinate[] }, state: RoomState }` | 对局结束广播。|
| `pong` | `{ ts: number }` | 心跳回应。|

### 数据结构（节选）

```ts
interface PlayerSeat {
  playerId: string;
  stone: 'black' | 'white';
  ready: boolean;
}

interface Coordinate { x: number; y: number; }
```

更多字段详见 [`openapi.yaml`](../openapi.yaml) 中的 `RoomState`、`GomokuMove`、`GomokuEngineState`。
