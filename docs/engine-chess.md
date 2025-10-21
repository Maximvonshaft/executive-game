# 国际象棋引擎规范（engine-chess.md）

> 版本：training-v1 — Phase 2 训练版，仅校验基础颜色与占位，不包含完整棋规。

## 布局与符号
- 8×8 棋盘，坐标 `(0,0)` 表示 a8，`x` 向右（文件 a→h），`y` 向下（排名 8→1）。
- 棋子缩写：`w/b` 前缀表示白/黑，`R/N/B/Q/K/P` 分别为车、马、象、后、王、兵。
- `match_started` 事件返回 `players`，含 `color: 'white' | 'black'`。

## 状态结构
```ts
interface ChessState {
  board: Array<Array<string | null>>; // 8 行 × 8 列
  currentPlayerIndex: 0 | 1;         // 0 白、1 黑
  history: Array<{ type: 'move'; seat: number; from: { x: number; y: number }; to: { x: number; y: number }; piece: string; capture?: string | null }>;
  captured: {
    white: string[]; // 白方吃到的黑子
    black: string[]; // 黑方吃到的白子
  };
  finished: boolean;
}
```

## 动作格式
- `play_action`：
  ```json
  {
    "roomId": "...",
    "action": {
      "from": { "x": 4, "y": 6 },
      "to": { "x": 4, "y": 4 }
    }
  }
  ```
- 引擎校验：
  1. `from` 必须存在棋子，且颜色与当前玩家匹配，否则 `ACTION_NO_PIECE` / `ACTION_NOT_PLAYER_TURN`。
  2. `to` 必须在棋盘内，且若存在棋子不可与己方同色，否则 `ACTION_OUT_OF_RANGE` / `ACTION_CAPTURE_SELF`。
  3. 吃到对方国王（`bK` 或 `wK`）直接结束，`reason: 'capture_king'`。
- 不包含：走法合法性、王车易位、吃过路兵、升变等高级规则，适用于训练 UI 交互链路。

## 事件与公共态
- `action_applied`
  ```jsonc
  {
    "roomId": "...",
    "playerId": "player-white",
    "seat": 0,
    "color": "white",
    "action": {
      "type": "move",
      "from": { "x": 4, "y": 6 },
      "to": { "x": 4, "y": 4 },
      "capture": null
    },
    "board": [...],
    "captured": {
      "white": [],
      "black": []
    }
  }
  ```
- `RoomState.state`：
  ```jsonc
  {
    "board": [...],
    "currentColor": "black",
    "captured": {
      "white": ["bP"],
      "black": []
    },
    "history": [
      { "type": "move", "seat": 0, "from": { "x": 4, "y": 6 }, "to": { "x": 4, "y": 4 }, "piece": "wP" }
    ]
  }
  ```

## 错误码
- `ACTION_NO_PIECE`
- `ACTION_NOT_PLAYER_TURN`
- `ACTION_OUT_OF_RANGE`
- `ACTION_CAPTURE_SELF`
- `MATCH_ALREADY_FINISHED`

## 扩展建议
- 后续可补充完整棋规（合法走法生成、易位/升变/吃过路兵），并在 `state` 中追加半步计数、可易位状态等信息。
- 支持 SAN/PGN 记谱，方便与观战/回放接轨。
