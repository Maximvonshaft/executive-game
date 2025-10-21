# 斗地主引擎规范（engine-doudizhu.md）

> 版本：training-v1 — Phase 2 训练版规则，用于验证多玩法接入链路。

## 牌组与座位
- 牌组：标准 54 张（黑桃/红心/梅花/方块 3-A + 2，两张 Joker）。
- 发牌：按匹配顺序依次发牌，先到者默认为地主，另两位为农民；底牌 3 张暂不翻开。
- 座位：`seat=0` 地主，`seat=1/2` 农民。`match_started` 事件返回玩家角色。

## 状态结构
```ts
interface DoudizhuState {
  deck: string[];            // 固定顺序，便于回放
  hands: string[][];        // [seat][card]
  bottomCards: string[];    // 3 张底牌（训练版暂不发放）
  currentPlayerIndex: number;
  trickLeader: number;      // 当前出牌轮的首家 seat
  lastAction: null | { type: 'play_cards'; cards: string[]; playerIndex: number };
  history: Array<{ type: 'play_cards' | 'pass' | 'declare_winner'; seat: number; cards: string[] }>;
  finished: boolean;
}
```

## WebSocket 动作
| type | 说明 | payload 示例 |
| --- | --- | --- |
| `play_cards` | 出牌，需附带 `cards` | `{ type: 'play_cards', cards: ['S3', 'H3'] }` |
| `pass` | 过牌，仅当本轮已有人出牌时允许 | `{ type: 'pass' }` |
| `declare_winner` | 宣布胜利（训练用途） | `{ type: 'declare_winner', winners: [1, 2], reason: 'training_win' }` |

- 服务端会校验手牌所属：若 `cards` 不在玩家手牌中返回 `ACTION_CARD_NOT_OWNED`。
- 本轮首家不可 `pass`，否则返回 `ACTION_PASS_NOT_ALLOWED`。
- 重复/未实现的动作返回 `ACTION_UNSUPPORTED`。

## 事件
- `action_applied`
  ```jsonc
  {
    "roomId": "...",
    "playerId": "player-a",
    "seat": 0,
    "role": "landlord",
    "action": {
      "type": "play_cards",
      "cards": ["S3", "H3"]
    },
    "handCounts": [
      { "seat": 0, "count": 14 },
      { "seat": 1, "count": 17 },
      { "seat": 2, "count": 17 }
    ],
    "lastAction": {
      "type": "play_cards",
      "cards": ["S3", "H3"],
      "seat": 0
    }
  }
  ```
- `match_result`：`winnerSeats` 与 `winnerIds` 表示胜者，可通过 `declare_winner` 或手牌打完触发；`reason` 包含 `hand_empty`/`declared` 等。

## 回放与补帧
- `state.handCounts` 按 seat 返回剩余牌数，UI 可用于绘制信息差。
- `state.lastAction` 提供最近一手（过牌返回 `type: 'pass'`）。
- `history` 累积所有动作，结合 `deck` 可重建训练局面。

## 扩展方向
- Phase 2 后续可补充叫地主/抢地主、底牌加牌、炸弹倍数等完整规则。
- 添加倒计时与托管逻辑，扩展 `action` 为异步下注/抢地主动作。
