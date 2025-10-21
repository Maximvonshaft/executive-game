# Phase 1 WebSocket Contract

> 版本：v1 — 实现匹配 / 房间 / 五子棋实时对局闭环

## Endpoint
- URL: `ws://<host>/ws?token=<JWT>`
- 鉴权：查询参数 `token` 为 Phase 0 登录返回的 JWT，会在握手后立即校验。
- 协议：纯文本 JSON，UTF-8 编码。

## 客户端 → 服务端
| 事件 | 描述 | Payload |
| --- | --- | --- |
| `join_room` | 订阅房间事件流，并立即收到最新 `room_state` | `{ "roomId": string, "sinceSeq?": number }` |
| `ready` | 准备完毕，等待开局 | `{ "roomId": string }` |
| `play_action` | 发起游戏动作 | `{ "roomId": string, "action": object }`<br/>（兼容 Phase 1，可继续发送 `position` 字段，服务端会转换为 `{ action: { position } }`） |
| `request_state` | 按序号补齐历史事件 | `{ "roomId": string, "sinceSeq": number }` |
| `ping` | 客户端心跳 | `{}` |

## 服务端 → 客户端
| 事件 | 描述 | Payload |
| --- | --- | --- |
| `room_state` | 房间全量状态（含棋盘、玩家、结果） | `{ "sequence": number, "state": RoomState }` |
| `player_ready` | 某玩家完成准备 | `{ "sequence": number, "payload": { roomId, playerId } }` |
| `match_started` | 所有玩家准备完毕，进入对局 | `{ "sequence": number, "payload": { roomId, gameId, players[] } }`（`players[]` 由具体引擎决定，例如五子棋含 `stone`，斗地主含 `role`） |
| `turn_started` | 轮到某玩家行动 | `{ "sequence": number, "payload": { roomId, playerId, seat?, stone?/role?/color? } }` |
| `action_applied` | 动作成功并广播局面 | `{ "sequence": number, "payload": { roomId, playerId, seat?, action, stateDiff? } }`（五子棋继续返回 `board`/`moves`，斗地主会返回 `handCounts`、`lastAction` 等） |
| `action_rejected` | 动作无效，包含原因 | `{ "sequence": number, "payload": { roomId, playerId, reason, action } }` |
| `match_result` | 对局结束（胜负或平局） | `{ "sequence": number, "payload": { roomId, winnerId?, winnerIds?, winnerSeats?, reason, extra? } }` |
| `pong` | 心跳应答 | `{ "timestamp": number }` |
| `error` | 业务错误提示 | `{ "code": string }` |

`RoomState` 结构与 `/api/rooms/join` 返回值一致，字段说明：
```ts
interface RoomState {
  roomId: string;
  gameId: string;
  status: 'waiting' | 'active' | 'finished';
  players: Array<Record<string, unknown>>; // 由各引擎返回，至少包含 id/seat/ready
  sequence: number;
  result: null | Record<string, unknown>;
  state: Record<string, unknown>; // 引擎公开态，如五子棋的 board/moves、斗地主的 handCounts 等
  board?: Array<Array<string | null>> | null; // 向后兼容 Phase 1
  moves?: Array<Record<string, unknown>>;
  handCounts?: Array<{ seat: number; count: number }>;
  community?: Array<string>;
  nextTurnPlayerId: string | null;
}
```

## 心跳与重连
- 客户端应每 20s 发送一次 `ping`，服务器立即回复 `pong`。
- 断线重连后，重新 `join_room`，并携带上一次收到的 `sequence`；服务端会补齐缺失事件。

## 幂等与幂等等价
- `join_room` 多次调用会复用同一订阅。
- 对于重复的 `play_action`（同一坐标），服务端会广播 `action_rejected`，不改变棋盘。
- `ready` 事件幂等，重复调用不改变状态。

## 错误码
| Code | 说明 |
| --- | --- |
| `AUTH_TOKEN_REQUIRED` | 未携带 JWT |
| `AUTH_TOKEN_INVALID` | JWT 无效或过期 |
| `ROOM_NOT_MEMBER` | 非房间成员 |
| `ROOM_ID_REQUIRED` | 缺少房间编号 |
| `ROOM_NOT_ACTIVE` | 对局尚未开始 |
| `ACTION_INVALID` | 动作 payload 不完整 |
| `ACTION_OUT_OF_RANGE` / `ACTION_NOT_PLAYER_TURN` | 规则校验失败（坐标越界 / 未轮到当前玩家） |
| `ACTION_CELL_OCCUPIED` | 五子棋落子点已被占用 |
| `ACTION_CARD_NOT_OWNED` | 斗地主尝试出的牌不在手牌中 |
| `ACTION_PASS_NOT_ALLOWED` | 斗地主在当前轮不允许过牌 |
| `ACTION_UNSUPPORTED` | 引擎未实现该动作类型 |
| `ACTION_PLAYER_FOLDED` | 德州扑克玩家已弃牌 |
| `ACTION_NOT_ENOUGH_STACK` | 德州扑克筹码不足 |
| `ACTION_PHASE_COMPLETE` | 德州扑克公共牌已全部翻出 |
| `ACTION_NO_PIECE` | 象棋/国际象棋原位置没有棋子 |
| `ACTION_CAPTURE_SELF` | 不能吃掉己方棋子 |
| `MATCH_ALREADY_FINISHED` | 对局已结束 |
| `MESSAGE_MALFORMED` | JSON 格式错误 |
| `MESSAGE_UNSUPPORTED` | 未知事件类型 |
| `SERVER_ERROR` | 内部错误 |

客户端收到 `error` 后可以根据需要提示或重试；所有错误均不会改变已有状态。
