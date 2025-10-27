# 房间事件协议（Room Events Protocol）

本文定义 Phaser3-DDZ 实时对战的房间事件协议，涵盖事件枚举、字段、错误码以及补帧策略。该协议为客户端与房间服务之间 WebSocket 通信的权威说明。

## 1. 报文封装

所有事件采用 JSON 对象传输，顶层字段如下：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `event` | string | 是 | 事件名称（大写蛇形） |
| `seqId` | integer | 是 | 事件序号，自 1 开始递增；`0` 仅用于连接事件 |
| `roomId` | string | 否 | 所属房间 ID，匹配阶段可为空 |
| `stateHash` | string | 否 | 当前房间状态 SHA256，供客户端校验 |
| `payload` | object | 否 | 事件负载，根据事件类型定义 |

## 2. 事件列表

### 2.1 系统事件

| 事件 | 说明 | 负载字段 |
| --- | --- | --- |
| `WELCOME` | 连接成功，下发服务器时间与 Session | `serverTime`, `sessionId` |
| `FORCE_LOGOUT` | 当前连接被挤下线 | `reason`, `platform`, `conflictSessionId` |
| `ERROR` | 通用异常事件 | `code`, `message`, `details` |

### 2.2 匹配流程

| 事件 | 说明 | 负载 |
| --- | --- | --- |
| `MATCH_QUEUE_JOINED` | 成功加入匹配队列 | `mode`, `estimatedWaitMs` |
| `MATCH_FOUND` | 匹配成功，分配房间 | `roomId`, `players`, `seat`, `seed` |
| `ROOM_READY` | 房间加载完成，等待所有客户端确认 | `roomId`, `players` |

### 2.3 对局流程

| 事件 | 说明 | 负载字段 |
| --- | --- | --- |
| `GAME_START` | 对局正式开始 | `roomId`, `landlord`, `hands`, `bottomCards`, `multiplier` |
| `BID_START` | 叫分阶段开始 | `turnSeat`, `timeoutMs` |
| `BID_ACTION` | 某玩家叫分结果 | `seat`, `bid`, `multiplier` |
| `TURN_START` | 出牌回合开始 | `seat`, `timeoutMs`, `canPass` |
| `PLAY_ACTION` | 某玩家出牌 | `seat`, `cards`, `pattern`, `comboScore` |
| `TURN_END` | 回合结束 | `nextSeat`, `lastPlay` |
| `ROUND_RESULT` | 单局结算 | `winner`, `multiplier`, `scoreDelta`, `streak` |
| `GAME_RESULT` | 对局结果 | `winners`, `losers`, `baseScore`, `multiplier`, `finalScores`, `replayId` |
| `SPECTATOR_JOIN` | 观战者加入 | `spectatorId`, `nickname` |
| `SPECTATOR_LEAVE` | 观战者离开 | `spectatorId` |

### 2.4 断线与重连

| 事件 | 说明 | 负载 |
| --- | --- | --- |
| `RESUME_REQUIRED` | 提示客户端需要发起补帧 | `resumeToken`, `missingFrom` |
| `STATE_SNAPSHOT` | 下发完整房间快照 | `players`, `handsHash`, `discardHistory`, `turn`, `multiplier`, `lastSeqId` |
| `STATE_DIFF` | 下发增量事件 | `events`（数组，嵌套与正常事件一致） |

## 3. 补帧策略

1. 客户端维护本地 `lastSeqId` 与 `stateHash`。
2. 当 `seqId` 出现缺失时发送 `RESUME_REQUEST`：

```json
{
  "event": "RESUME_REQUEST",
  "seqId": 0,
  "roomId": "room-123",
  "payload": {
    "from": 105,
    "stateHash": "9fe2..."
  }
}
```

3. 服务端根据缺失数量决定：
   * 缺失 ≤ 20：返回 `STATE_DIFF`，包含缺失事件数组；
   * 缺失 > 20 或 `stateHash` 不一致：返回 `STATE_SNAPSHOT`，客户端重放。
4. 客户端完成补帧后发送 `RESUME_ACK` 确认。

## 4. 错误码

| 错误码 | 场景 | 说明 |
| --- | --- | --- |
| `INVALID_ACTION` | 出牌非法 | 牌型或顺序不合法 |
| `NOT_YOUR_TURN` | 回合错误 | 未轮到当前玩家 |
| `RESUME_EXPIRED` | 补帧失败 | `resumeToken` 过期 |
| `SESSION_CONFLICT` | 会话冲突 | 账号在其他设备登录 |
| `SERVER_MAINTENANCE` | 维护模式 | 系统维护中 |

## 5. 数据结构补充

### 玩家对象 `player`

```json
{
  "uid": "bcd8-...",
  "seat": 1,
  "nickname": "玩家A",
  "avatar": "https://cdn.example.com/avatar/a.png",
  "role": "FARMER",
  "mmr": 1320,
  "streak": 2
}
```

### 手牌表示 `cards`

* 使用数组存储，每张牌为 `{ "suit": "SPADE", "rank": "A" }`。
* 炸弹等组合通过 `pattern` 字段表示，如 `pattern: "BOMB"`。

## 6. 版本控制

* 初始版本：`1.0.0`（2024-05-28）
* 任何破坏性变更需提升主版本号，并提供兼容策略。

---

最后更新：2024-05-28。
