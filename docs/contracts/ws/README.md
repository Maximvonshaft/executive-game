# WebSocket 事件契约

本文件列出 Phaser3-DDZ 房间实时事件的结构、字段与样例，对应服务端 `ws` 通道与客户端网络层实现。详细协议说明在 `proto/room-events.md`，此处提供 JSON 视图供 QA 和前端模拟。

## 1. 连接与鉴权

* 客户端建立 WebSocket 连接时需要携带 `Authorization: Bearer <accessToken>` 头。
* 连接建立后服务端会发送 `WELCOME` 事件，包含 `serverTime` 与 `sessionId`。

```json
{
  "event": "WELCOME",
  "seqId": 0,
  "serverTime": "2024-05-28T03:22:12.000Z",
  "sessionId": "sess_123"
}
```

## 2. 匹配与房间事件

核心事件类型与字段如下，更多详见 `proto/room-events.md`。

| 事件 | 说明 | 关键字段 |
| --- | --- | --- |
| `MATCH_FOUND` | 匹配成功并分配房间 | `roomId`, `seat`, `players` |
| `GAME_START` | 对局开始，包含初始手牌 | `roomId`, `landlord`, `hands` |
| `TURN_START` | 当前出牌权转移 | `seqId`, `currentSeat`, `timeoutMs` |
| `PLAY_ACTION` | 玩家出牌 | `seqId`, `seat`, `cards`, `pattern` |
| `ROUND_RESULT` | 单回合结果 | `seqId`, `winner`, `scoreDelta` |
| `GAME_RESULT` | 对局结算 | `roomId`, `result`, `multiplier`, `rewards` |
| `FORCE_LOGOUT` | 会话被踢下线 | `reason`, `platform` |

## 3. 错误事件

所有异常以 `ERROR` 事件形式下发：

```json
{
  "event": "ERROR",
  "seqId": 42,
  "code": "INVALID_ACTION",
  "message": "Card pattern does not follow the previous play"
}
```

错误码列表见 `proto/room-events.md#错误码`。

## 4. Mock 建议

1. QA 可使用 `ws-replay`（自研工具）或 `wscat` 重放 `samples/` 目录下的事件序列。
2. Playwright 端到端测试中推荐将事件录制为 JSON Lines，模拟房间广播。
3. 若协议调整，需同步更新 `proto/room-events.md` 与 `docs/contracts/openapi.yaml` 中引用的 Schema。

最后更新：2024-05-28。
