# 五子棋引擎规范（engine-gomoku.md）

## 目标
- 提供纯函数化的状态更新（无副作用、无 I/O），方便在服务端与未来的模拟器中复用。
- 保留历史落子、胜负信息，支持事件溯源与回放。

## 棋盘设定
- 棋盘尺寸：默认 `15 x 15`，可通过 `size` 参数调整（最小 5）。
- 先手执黑，后手执白；无禁手，规则采用自由开局（Freestyle）。
- 五子连珠即判胜，不区分长连、活四等高级规则。

## 数据结构
```ts
interface GomokuState {
  size: number;                  // 棋盘边长
  board: (null | 'black' | 'white')[][]; // 当前棋面
  history: Array<{ stone: 'black' | 'white'; x: number; y: number }>;
  nextStone: 'black' | 'white' | null;   // null 表示对局已结束
  winner: 'black' | 'white' | null;
  winningLine: Array<{ x: number; y: number }> | null;
  finished: boolean;             // 是否已结束（胜利或平局）
}
```

## API

### `createInitialState({ size = 15, startingStone = 'black' })`
- 返回初始棋局状态。
- 当 `size < 5` 时抛出错误。

### `placeStone(state, { stone, x, y })`
- 输入上一状态与落子指令，返回**新状态**（不可变）。
- 校验：
  - `state.finished === true` 时抛出 `Game already finished.`；
  - 非当前行动方抛出 `Unexpected player turn.`；
  - 越界、重复落子分别抛出错误。
- 落子后自动切换 `nextStone`，若产生胜利线则填充 `winner` 与 `winningLine`。
- 若棋盘已满且无胜者，`finished = true` 且 `winner = null`。

### `buildSnapshot(state)`
- 深拷贝棋盘与历史，避免外部代码修改内部状态。
- 供房间服务广播给客户端使用。

## 胜负判定
- 引擎沿四个方向扫描（水平、垂直、正斜、反斜），寻找连续五个同色棋子即判胜。
- 返回的 `winningLine` 为长度 5 的坐标数组，按落子方向排序。

## 复盘 / 回放
- `history` 字段保存完整落子序列，可复用在：
  - 服务端事件溯源、审计；
  - 客户端断线重连时快速重构棋盘；
  - 未来的录像/回放功能。

## 错误处理
- 引擎仅抛出 `Error`，由上层服务（`RoomService`）统一捕获并包装成 `ROOM_ACTION_INVALID`。

---

后续若引入禁手、让子等规则，可在保持函数签名不变的情况下扩展 `meta` 参数与校验逻辑。
