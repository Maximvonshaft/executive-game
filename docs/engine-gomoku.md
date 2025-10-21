# 五子棋引擎规范（engine-gomoku.md）

> 版本：v1 — 对应 Phase 1 闭环实现

## 棋盘与落子规则
- 棋盘尺寸：15 x 15，坐标系从左上角开始，`x` 水平向右、`y` 垂直向下。
- 落子顺序：黑先、白后；房间创建时按照匹配顺序分配：排队先到者执黑。
- 禁手：Phase 1 不做禁手校验（自由连五）。
- 判胜条件：任意方向（水平/垂直/两条对角线）连续 5 子即获胜。
- 平局条件：棋盘占满且无人获胜。

## 状态结构
```ts
interface GomokuState {
  boardSize: 15;
  board: Array<Array<'black' | 'white' | null>>;
  moves: Array<{ x: number; y: number; stone: 'black' | 'white' }>;
  nextPlayerIndex: 0 | 1;
  winner: 0 | 1 | null;
  winningLine: Array<{ x: number; y: number }> | null;
  finished: boolean;
}
```

## 纯函数接口
- `createInitialState(): GomokuState` — 创建初始局面。
- `applyMove(state, action)` — 执行落子动作：
  - 入参：`{ x: number; y: number; playerIndex: 0 | 1 }`
  - 返回值：
    ```ts
    {
      state: GomokuState;        // 新状态（不可变）
      result: null | {           // 对局结果（非 null 表示已结束）
        winner: 0 | 1 | null;
        reason: 'five_in_a_row' | 'draw';
        winningLine?: Array<{ x: number; y: number }>;
      };
      error: null |
        'ACTION_OUT_OF_RANGE' |
        'ACTION_NOT_PLAYER_TURN' |
        'ACTION_CELL_OCCUPIED' |
        'MATCH_ALREADY_FINISHED';
      appliedMove?: { x: number; y: number; playerIndex: 0 | 1 };
    }
    ```
  - 若 `error` 非空，则返回原状态、并由上层透出 `action_rejected` 事件。

## 事件溯源
每一步落子都会追加事件：
- `action_applied`: 包含落子位置、当前棋盘快照（`board`）以及累计 `moves`。
- `match_result`: 在 `result` 非空时触发，包含胜者 ID、原因、`winningLine`（如果有）。
- `turn_started`: 通知下一位落子方。

事件序号（`sequence`）由房间维护，客户端可通过 `request_state` 携带 `sinceSeq` 快速补齐状态。该序列为单调递增整数。

## 幂等等价性
- 纯函数不修改入参，返回的新状态可直接替换旧状态。
- 同一落子重复提交时会返回 `ACTION_CELL_OCCUPIED` 并触发 `action_rejected`。
- 对于已结束的对局，任何进一步操作返回 `MATCH_ALREADY_FINISHED`。

## 扩展方向（Phase 1 范围外）
- 禁手校验（长连 / 双三 / 双四）。
- 倒计时 / 超时判负。
- 悔棋、和棋请求等双边操作。
