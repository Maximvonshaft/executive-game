const BOARD_SIZE = 15;
const LINE_TARGET = 5;

function createInitialState() {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  return {
    boardSize: BOARD_SIZE,
    board,
    moves: [],
    nextPlayerIndex: 0,
    winner: null,
    winningLine: null,
    finished: false
  };
}

function isInsideBoard(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function scanDirection(board, x, y, dx, dy, playerIndex) {
  let count = 0;
  const positions = [];
  let cx = x;
  let cy = y;
  while (isInsideBoard(cx, cy) && board[cy][cx] === playerIndex) {
    positions.push({ x: cx, y: cy });
    count += 1;
    cx += dx;
    cy += dy;
  }
  return { count, positions };
}

function detectWinningLine(board, x, y, playerIndex) {
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 }
  ];
  for (const { dx, dy } of directions) {
    const forward = scanDirection(board, x, y, dx, dy, playerIndex);
    const backward = scanDirection(board, x, y, -dx, -dy, playerIndex);
    const combinedCount = forward.count + backward.count - 1;
    if (combinedCount >= LINE_TARGET) {
      const merged = new Map();
      forward.positions.forEach((pos) => merged.set(`${pos.x}:${pos.y}`, pos));
      backward.positions.forEach((pos) => merged.set(`${pos.x}:${pos.y}`, pos));
      return Array.from(merged.values())
        .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))
        .slice(0, LINE_TARGET);
    }
  }
  return null;
}

function applyMove(state, action) {
  if (!state || typeof state !== 'object') {
    throw new Error('State is required');
  }
  if (state.finished) {
    return {
      state,
      result: {
        winner: state.winner,
        reason: state.winner ? 'already_finished' : 'draw'
      },
      error: 'MATCH_ALREADY_FINISHED'
    };
  }
  const { x, y, playerIndex } = action;
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    return { state, result: null, error: 'ACTION_OUT_OF_RANGE' };
  }
  if (!isInsideBoard(x, y)) {
    return { state, result: null, error: 'ACTION_OUT_OF_RANGE' };
  }
  if (playerIndex !== state.nextPlayerIndex) {
    return { state, result: null, error: 'ACTION_NOT_PLAYER_TURN' };
  }
  const currentCell = state.board[y][x];
  if (currentCell !== null && currentCell !== undefined) {
    return { state, result: null, error: 'ACTION_CELL_OCCUPIED' };
  }

  const board = state.board.map((row) => row.slice());
  board[y][x] = playerIndex;
  const moves = state.moves.concat({ x, y, playerIndex });

  let winner = null;
  let winningLine = null;
  const detected = detectWinningLine(board, x, y, playerIndex);
  if (detected) {
    winner = playerIndex;
    winningLine = detected;
  }

  const isBoardFull = moves.length >= BOARD_SIZE * BOARD_SIZE;
  const finished = Boolean(winner !== null || isBoardFull);
  const nextPlayerIndex = finished ? state.nextPlayerIndex : (playerIndex + 1) % 2;

  const nextState = {
    boardSize: BOARD_SIZE,
    board,
    moves,
    nextPlayerIndex,
    winner,
    winningLine,
    finished
  };

  let result = null;
  if (winner !== null) {
    result = {
      winner: playerIndex,
      reason: 'five_in_a_row',
      winningLine
    };
  } else if (isBoardFull) {
    result = {
      winner: null,
      reason: 'draw'
    };
  }

  return {
    state: nextState,
    result,
    error: null,
    appliedMove: { x, y, playerIndex }
  };
}

function serializeBoard(board) {
  return board.map((row) => row.map((cell) => {
    if (cell === null || cell === undefined) {
      return null;
    }
    return cell === 0 ? 'black' : 'white';
  }));
}

module.exports = {
  BOARD_SIZE,
  LINE_TARGET,
  createInitialState,
  applyMove,
  serializeBoard
};
