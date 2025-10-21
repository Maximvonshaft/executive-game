const {
  createInitialState,
  applyMove,
  serializeBoard
} = require('./gomoku');

function assignSeats({ playerIds }) {
  return playerIds.map((_, index) => ({
    seat: index,
    stone: index === 0 ? 'black' : 'white'
  }));
}

function describePlayer(player) {
  return {
    id: player.id,
    seat: player.seat,
    stone: player.stone,
    ready: player.ready
  };
}

function describeMatchStart({ room }) {
  return {
    roomId: room.id,
    gameId: room.gameId,
    players: room.players.map((player) => ({
      id: player.id,
      seat: player.seat,
      stone: player.stone
    }))
  };
}

function getTurnInfo({ room, state }) {
  if (!state || state.finished) {
    return null;
  }
  const currentPlayer = room.players[state.nextPlayerIndex];
  return {
    roomId: room.id,
    playerId: currentPlayer.id,
    stone: currentPlayer.stone
  };
}

function mapMoves(moves) {
  return moves.map((move) => ({
    x: move.x,
    y: move.y,
    stone: move.playerIndex === 0 ? 'black' : 'white'
  }));
}

function applyAction({ room, state, players, playerIndex, action }) {
  if (!action || typeof action !== 'object') {
    return { state, events: [], error: 'ACTION_INVALID' };
  }
  const position = action.position;
  if (!position || !Number.isInteger(position.x) || !Number.isInteger(position.y)) {
    return { state, events: [], error: 'ACTION_INVALID' };
  }
  const result = applyMove(state, { x: position.x, y: position.y, playerIndex });
  if (result.error) {
    return { state, events: [], error: result.error };
  }
  const nextState = result.state;
  const player = players[playerIndex];
  const events = [
    {
      type: 'action_applied',
      payload: {
        roomId: room.id,
        playerId: player.id,
        stone: player.stone,
        position: { x: position.x, y: position.y },
        board: serializeBoard(nextState.board),
        moves: mapMoves(nextState.moves)
      }
    }
  ];
  let outcome = null;
  if (result.result) {
    outcome = {
      winnerIndex: result.result.winner,
      reason: result.result.reason,
      winningLine: result.result.winningLine || null
    };
  }
  return {
    state: nextState,
    events,
    error: null,
    result: outcome
  };
}

function describeResult({ room, result }) {
  const winnerId =
    typeof result.winnerIndex === 'number' && result.winnerIndex !== null
      ? room.players[result.winnerIndex]?.id || null
      : null;
  const summary = {
    winnerId,
    reason: result.reason,
    winningLine: result.winningLine || null
  };
  const eventPayload = {
    roomId: room.id,
    winnerId,
    reason: result.reason,
    winningLine: result.winningLine || null
  };
  return { summary, eventPayload };
}

function getPublicState({ room, state }) {
  if (!state) {
    return {
      board: null,
      moves: [],
      nextTurnPlayerId: null
    };
  }
  return {
    board: serializeBoard(state.board),
    moves: mapMoves(state.moves),
    nextTurnPlayerId: state.finished ? null : room.players[state.nextPlayerIndex]?.id || null
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
