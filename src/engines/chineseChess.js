const BOARD_WIDTH = 9;
const BOARD_HEIGHT = 10;

function createInitialBoard() {
  return [
    ['bR', 'bN', 'bE', 'bA', 'bK', 'bA', 'bE', 'bN', 'bR'],
    [null, null, null, null, null, null, null, null, null],
    [null, 'bC', null, null, null, null, null, 'bC', null],
    ['bP', null, 'bP', null, 'bP', null, 'bP', null, 'bP'],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    ['rP', null, 'rP', null, 'rP', null, 'rP', null, 'rP'],
    [null, 'rC', null, null, null, null, null, 'rC', null],
    [null, null, null, null, null, null, null, null, null],
    ['rR', 'rN', 'rE', 'rA', 'rK', 'rA', 'rE', 'rN', 'rR']
  ];
}

function assignSeats({ playerIds }) {
  if (playerIds.length !== 2) {
    throw new Error('Chinese chess requires exactly two players');
  }
  return [
    { seat: 0, color: 'red' },
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
      red: [],
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
  return x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT;
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
      red: state.captured.red.slice(),
      black: state.captured.black.slice()
    }
  };

  const piece = nextState.board[from.y][from.x];
  if (!piece) {
    return { state, events: [], error: 'ACTION_NO_PIECE' };
  }
  const pieceColor = piece[0] === 'r' ? 'red' : 'black';
  const expectedColor = players[playerIndex].color;
  if (pieceColor !== expectedColor) {
    return { state, events: [], error: 'ACTION_NOT_PLAYER_TURN' };
  }
  const target = nextState.board[to.y][to.x];
  if (target) {
    const targetColor = target[0] === 'r' ? 'red' : 'black';
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
  if (target && (target === 'bK' || target === 'rK')) {
    nextState.finished = true;
    outcome = {
      winnerSeats: [players[playerIndex].seat],
      reason: 'capture_general'
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
          red: nextState.captured.red.slice(),
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
      currentColor: 'red',
      captured: {
        red: [],
        black: []
      },
      history: []
    };
  }
  return {
    board: state.board,
    currentColor: state.finished ? null : room.players[state.currentPlayerIndex].color,
    captured: {
      red: state.captured.red.slice(),
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
