# 德州扑克引擎规范（engine-texas.md）

> 版本：training-v1 — Phase 2 验证多玩法链路的轻量实现。

## 座位与筹码
- 匹配最多 6 人，`seat=0` 为庄家（Dealer），其余为顺时针编号。
- 训练版固定筹码：每人 1000，`match_started` 事件中返回 `stack` 与 `role`。
- 暂不处理盲注与下注逻辑，所有筹码变化由客户端动作显式告知。

## 状态结构
```ts
interface TexasState {
  deck: string[];            // 52 张扑克牌，固定顺序
  hands: string[][];        // 每位玩家两张底牌（仅服务器保存，不在广播中明文透出）
  communityCards: string[]; // 预先洗好的公共牌顺序
  revealedCount: number;    // 已翻开的公共牌数量（0/3/4/5）
  pot: number;
  bets: number[];           // 本轮下注额（训练版保留结构，暂未使用）
  stacks: number[];         // 剩余筹码
  folded: boolean[];        // 是否弃牌
  history: Array<{ type: string; seat: number; amount?: number; winners?: number[]; phase: number }>;
  currentPlayerIndex: number;
  finished: boolean;
}
```

## 支持的动作
| type | 说明 | 附加字段 |
| --- | --- | --- |
| `check` | 过牌 | 无 |
| `bet` / `call` | 加注 / 跟注，训练版直接从 `stack` 扣除对应 `amount` 并累加 `pot` | `amount: number` |
| `fold` | 弃牌，若场上仅剩 1 人则直接结算 | 无 |
| `advance_phase` | 翻下一街公共牌（Preflop→Flop→Turn→River），若已全部翻开返回 `ACTION_PHASE_COMPLETE` | 无 |
| `declare_winner` | 手动结束牌局并指定胜者座位 | `winners: number[]`, `reason?: string` |

非法输入返回：
- `ACTION_PLAYER_FOLDED`：尝试行动的玩家已弃牌。
- `ACTION_NOT_ENOUGH_STACK`：下注金额大于剩余筹码。
- `ACTION_UNSUPPORTED`：未实现的动作类型。

## 广播事件
- `action_applied`
  ```jsonc
  {
    "roomId": "...",
    "playerId": "player-a",
    "seat": 0,
    "role": "dealer",
    "action": { "type": "bet", "amount": 50 },
    "pot": 50,
    "community": ["S5", "H5", "C5"],
    "stacks": [950, 1000, 1000],
    "foldedSeats": []
  }
  ```
- `match_result`：`winnerSeats` / `winnerIds` 返回胜者，可由 `fold` 自动触发（仅剩一人）或 `declare_winner` 指定。

## 公共状态（`RoomState.state`）
```jsonc
{
  "phase": "community_3",       // preflop / community_3 / community_4 / community_5 / showdown
  "community": ["S5", "H5", "C5"],
  "pot": 150,
  "stacks": [
    { "seat": 0, "stack": 900 },
    { "seat": 1, "stack": 950 }
  ],
  "foldedSeats": [2, 3],
  "history": [
    { "type": "bet", "seat": 0, "amount": 50, "phase": 0 },
    { "type": "fold", "seat": 2, "phase": 0 }
  ],
  "currentSeat": 1
}
```

## 扩展建议
- 引入盲注、下注轮次与有效加注校验，扩展 `history` 与 `state` 结构。
- 按需在 `action_applied` 中透出公共牌增量（`stateDiff.community`），减少传输量。
- 结合 Phase 3 任务，可将 `history` 与回放日志对齐。
