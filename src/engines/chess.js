const BOARD_SIZE = 8;

function createInitialBoard() {
  return [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    Array.from({ length: BOARD_SIZE }, () => 'bP'),
    Array.from({ length: BOARD_SIZE }, () => null),
    Array.from({ length: BOARD_SIZE }, () => null),
    Array.from({ length: BOARD_SIZE }, () => null),
    Array.from({ length: BOARD_SIZE }, () => null),
    Array.from({ length: BOARD_SIZE }, () => 'wP'),
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
  ];
}

function assignSeats({ playerIds }) {
  if (playerIds.length !== 2) {
    throw new Error('Chess requires exactly two players');
  }
  return [
    { seat: 0, color: 'white' },
    { seat: 1, color: 'black' }
  ];
}

function describePlayer(player) {
  return {
    id: player.id,
    seat: player.seat,
    color: player.color,
    ready: player.ready
  };
}

function createInitialState() {
  return {
    board: createInitialBoard(),
    currentPlayerIndex: 0,
    history: [],
    captured: {
      white: [],
      black: []
    },
    finished: false
  };
}

function describeMatchStart({ room, state }) {
  return {
    roomId: room.id,
    gameId: room.gameId,
    players: room.players.map((player) => ({
      id: player.id,
      seat: player.seat,
      color: player.color
    })),
    board: state.board
  };
}

function getTurnInfo({ room, state }) {
  if (!state || state.finished) {
    return null;
  }
  const current = room.players[state.currentPlayerIndex];
  return {
    roomId: room.id,
    playerId: current.id,
    seat: current.seat,
    color: current.color
  };
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function inBounds({ x, y }) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function applyAction({ room, state, players, playerIndex, action }) {
  if (!action || typeof action !== 'object') {
    return { state, events: [], error: 'ACTION_INVALID' };
  }
  if (state.finished) {
    return { state, events: [], error: 'MATCH_ALREADY_FINISHED' };
  }
  if (playerIndex !== state.currentPlayerIndex) {
    return { state, events: [], error: 'ACTION_NOT_PLAYER_TURN' };
  }
  const from = action.from;
  const to = action.to;
  if (!from || !to || !Number.isInteger(from.x) || !Number.isInteger(from.y) || !Number.isInteger(to.x) || !Number.isInteger(to.y)) {
    return { state, events: [], error: 'ACTION_INVALID' };
  }
  if (!inBounds(from) || !inBounds(to)) {
    return { state, events: [], error: 'ACTION_OUT_OF_RANGE' };
  }

  const nextState = {
    ...state,
    board: cloneBoard(state.board),
    history: state.history.slice(),
    captured: {
      white: state.captured.white.slice(),
      black: state.captured.black.slice()
    }
  };

  const piece = nextState.board[from.y][from.x];
  if (!piece) {
    return { state, events: [], error: 'ACTION_NO_PIECE' };
  }
  const pieceColor = piece[0] === 'w' ? 'white' : 'black';
  const expectedColor = players[playerIndex].color;
  if (pieceColor !== expectedColor) {
    return { state, events: [], error: 'ACTION_NOT_PLAYER_TURN' };
  }
  const target = nextState.board[to.y][to.x];
  if (target) {
    const targetColor = target[0] === 'w' ? 'white' : 'black';
    if (targetColor === pieceColor) {
      return { state, events: [], error: 'ACTION_CAPTURE_SELF' };
    }
    nextState.captured[pieceColor].push(target);
  }

  nextState.board[from.y][from.x] = null;
  nextState.board[to.y][to.x] = piece;
  nextState.history.push({
    type: 'move',
    seat: players[playerIndex].seat,
    from,
    to,
    piece,
    capture: target || null
  });

  let outcome = null;
  if (target && (target === 'bK' || target === 'wK')) {
    nextState.finished = true;
    outcome = {
      winnerSeats: [players[playerIndex].seat],
      reason: 'capture_king'
    };
  } else {
    nextState.currentPlayerIndex = (state.currentPlayerIndex + 1) % players.length;
  }

  const events = [
    {
      type: 'action_applied',
      payload: {
        roomId: room.id,
        playerId: players[playerIndex].id,
        seat: players[playerIndex].seat,
        color: players[playerIndex].color,
        action: {
          type: 'move',
          from,
          to,
          capture: target || null
        },
        board: nextState.board,
        captured: {
          white: nextState.captured.white.slice(),
          black: nextState.captured.black.slice()
        }
      }
    }
  ];

  return {
    state: nextState,
    events,
    error: null,
    result: outcome
  };
}

function describeResult({ room, result }) {
  const winnerIds = Array.isArray(result.winnerSeats)
    ? result.winnerSeats
        .map((seat) => room.players.find((player) => player.seat === seat)?.id)
        .filter(Boolean)
    : [];
  const summary = {
    winnerIds,
    winnerSeats: Array.isArray(result.winnerSeats) ? result.winnerSeats.slice() : [],
    reason: result.reason
  };
  const eventPayload = {
    roomId: room.id,
    winnerIds,
    winnerSeats: summary.winnerSeats,
    reason: result.reason
  };
  return { summary, eventPayload };
}

function getPublicState({ room, state }) {
  if (!state) {
    return {
      board: createInitialBoard(),
      currentColor: 'white',
      captured: {
        white: [],
        black: []
      },
      history: []
    };
  }
  return {
    board: state.board,
    currentColor: state.finished ? null : room.players[state.currentPlayerIndex].color,
    captured: {
      white: state.captured.white.slice(),
      black: state.captured.black.slice()
    },
    history: state.history.map((entry) => ({
      type: entry.type,
      seat: entry.seat,
      from: entry.from,
      to: entry.to,
      piece: entry.piece,
      capture: entry.capture
    }))
  };
}

module.exports = {
  assignSeats,
  describePlayer,
  createInitialState,
  describeMatchStart,
  getTurnInfo,
  applyAction,
  describeResult,
  getPublicState
};
