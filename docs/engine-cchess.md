# 中国象棋引擎规范（engine-cchess.md）

> 版本：training-v1 — Phase 2 训练版，仅校验基础走子合法性（不含具体棋规）。

## 初始布局
- 9 列 × 10 行，坐标系左上角为 `(0,0)`，`x` 向右、`y` 向下。
- 棋子缩写：`r/b` 前缀表示红/黑，`R/N/E/A/K/C/P` 分别为车、马、相、仕、将/帅、炮、兵/卒。
- `match_started` 广播 `players` 数组，含 `color: 'red' | 'black'`。

## 状态结构
```ts
interface ChineseChessState {
  board: Array<Array<string | null>>; // 10 行 × 9 列
  currentPlayerIndex: 0 | 1;         // 0 红、1 黑
  history: Array<{ type: 'move'; seat: number; from: { x: number; y: number }; to: { x: number; y: number }; piece: string; capture?: string | null }>;
  captured: {
    red: string[];   // 红方吃到的黑子
    black: string[]; // 黑方吃到的红子
  };
  finished: boolean;
}
```

## 动作格式
- `play_action` 需发送：
  ```json
  {
    "roomId": "...",
    "action": {
      "from": { "x": 0, "y": 9 },
      "to": { "x": 0, "y": 8 }
    }
  }
  ```
- 引擎仅校验：
  1. `from` 位置存在棋子，且颜色与轮到方一致。
  2. `to` 不越界，且若有棋子不得与己方颜色相同。
  3. 走子后若吃到 `K`（将）或 `k`（帅）则立即判胜，返回 `reason: 'capture_general'`。
- 未实现具体棋规（如马脚、炮隔山等），由前端训练模式自行约束。

## 事件与公共态
- `action_applied`
  ```jsonc
  {
    "roomId": "...",
    "playerId": "player-red",
    "seat": 0,
    "color": "red",
    "action": {
      "type": "move",
      "from": { "x": 0, "y": 9 },
      "to": { "x": 0, "y": 8 },
      "capture": null
    },
    "board": [...],
    "captured": {
      "red": [],
      "black": []
    }
  }
  ```
- `RoomState.state` 提供：
  ```jsonc
  {
    "board": [...],
    "currentColor": "black",
    "captured": {
      "red": ["bP"],
      "black": []
    },
    "history": [
      { "type": "move", "seat": 0, "from": { "x": 0, "y": 9 }, "to": { "x": 0, "y": 8 }, "piece": "rR" }
    ]
  }
  ```

## 错误码
- `ACTION_NO_PIECE`：`from` 位置无棋子。
- `ACTION_NOT_PLAYER_TURN`：尝试移动对手棋子。
- `ACTION_OUT_OF_RANGE`：坐标越界。
- `ACTION_CAPTURE_SELF`：目标位置为己方棋子。
- `MATCH_ALREADY_FINISHED`：已结束的对局重复行动。

## 扩展建议
- Phase 2 后续可补充具体棋规校验（马脚、仕/相九宫、炮隔山等）。
- 增加“将军”提示与合法走子集合，前端可利用 `state.history` 复盘。
