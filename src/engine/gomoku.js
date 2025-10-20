const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1]
];

function createInitialState({ size = 15, startingStone = 'black' } = {}) {
  if (size < 5) {
    throw new Error('Gomoku board size must be at least 5.');
  }
  const board = Array.from({ length: size }, () => Array.from({ length: size }, () => null));
  return {
    size,
    board,
    history: [],
    nextStone: startingStone,
    winner: null,
    winningLine: null,
    finished: false
  };
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function isInside(state, x, y) {
  return x >= 0 && y >= 0 && x < state.size && y < state.size;
}

function calculateWinningLine(board, stone, x, y, required = 5) {
  for (const [dx, dy] of DIRECTIONS) {
    const line = [{ x, y }];
    let step = 1;
    while (step < required) {
      const nx = x + dx * step;
      const ny = y + dy * step;
      if (!isInside({ size: board.length }, nx, ny) || board[ny][nx] !== stone) {
        break;
      }
      line.push({ x: nx, y: ny });
      step += 1;
    }
    step = 1;
    while (step < required) {
      const nx = x - dx * step;
      const ny = y - dy * step;
      if (!isInside({ size: board.length }, nx, ny) || board[ny][nx] !== stone) {
        break;
      }
      line.unshift({ x: nx, y: ny });
      step += 1;
    }
    if (line.length >= required) {
      return line.slice(0, required);
    }
  }
  return null;
}

function isBoardFull(board) {
  return board.every((row) => row.every((cell) => cell !== null));
}

function placeStone(state, { stone, x, y }) {
  if (state.finished) {
    throw new Error('Game already finished.');
  }
  if (stone !== state.nextStone) {
    throw new Error('Unexpected player turn.');
  }
  if (!isInside(state, x, y)) {
    throw new Error('Move outside of board.');
  }
  if (state.board[y][x] !== null) {
    throw new Error('Cell already occupied.');
  }
  const board = cloneBoard(state.board);
  board[y][x] = stone;
  const history = state.history.concat({ stone, x, y });
  const winningLine = calculateWinningLine(board, stone, x, y, 5);
  const winner = winningLine ? stone : null;
  const finished = Boolean(winner) || isBoardFull(board);
  return {
    size: state.size,
    board,
    history,
    nextStone: winner || finished ? null : stone === 'black' ? 'white' : 'black',
    winner,
    winningLine,
    finished
  };
}

function buildSnapshot(state) {
  return {
    size: state.size,
    board: state.board.map((row) => row.slice()),
    history: state.history.map((move) => ({ ...move })),
    nextStone: state.nextStone,
    winner: state.winner,
    winningLine: state.winningLine ? state.winningLine.map((cell) => ({ ...cell })) : null,
    finished: state.finished
  };
}

module.exports = {
  createInitialState,
  placeStone,
  buildSnapshot
};
