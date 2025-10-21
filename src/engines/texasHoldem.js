const SUITS = ['S', 'H', 'C', 'D'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function buildDeck() {
  const deck = [];
  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => deck.push(`${suit}${rank}`));
  });
  return deck;
}

function assignSeats({ playerIds }) {
  return playerIds.map((_, index) => ({
    seat: index,
    stack: 1000,
    role: index === 0 ? 'dealer' : 'player'
  }));
}

function describePlayer(player) {
  return {
    id: player.id,
    seat: player.seat,
    role: player.role,
    stack: player.stack,
    ready: player.ready
  };
}

function createInitialState({ room }) {
  const deck = buildDeck();
  const playerCount = room.players.length;
  const hands = Array.from({ length: playerCount }, (_, index) => deck.slice(index * 2, index * 2 + 2));
  const communityCards = deck.slice(playerCount * 2);
  return {
    deck,
    hands,
    communityCards,
    revealedCount: 0,
    pot: 0,
    bets: Array.from({ length: playerCount }, () => 0),
    stacks: Array.from({ length: playerCount }, () => 1000),
    folded: Array.from({ length: playerCount }, () => false),
    history: [],
    currentPlayerIndex: 0,
    finished: false
  };
}

function describeMatchStart({ room }) {
  return {
    roomId: room.id,
    gameId: room.gameId,
    players: room.players.map((player) => ({
      id: player.id,
      seat: player.seat,
      role: player.role,
      stack: player.stack
    })),
    communityRevealed: 0
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
    role: current.role,
    stack: state.stacks[state.currentPlayerIndex]
  };
}

function nextActivePlayer(state) {
  const playerCount = state.hands.length;
  if (playerCount === 0) {
    return 0;
  }
  for (let offset = 1; offset <= playerCount; offset += 1) {
    const candidate = (state.currentPlayerIndex + offset) % playerCount;
    if (!state.folded[candidate]) {
      return candidate;
    }
  }
  return state.currentPlayerIndex;
}

function summarizeCommunity(state) {
  return state.communityCards.slice(0, state.revealedCount);
}

function summarizeHistory(state) {
  return state.history.map((entry) => ({
    type: entry.type,
    seat: entry.seat,
    amount: entry.amount,
    phase: entry.phase,
    winners: entry.winners ? entry.winners.slice() : undefined
  }));
}

function countActivePlayers(state) {
  return state.folded.reduce((acc, folded) => (folded ? acc : acc + 1), 0);
}

function applyAction({ room, state, players, playerIndex, action }) {
  if (!action || typeof action !== 'object') {
    return { state, events: [], error: 'ACTION_INVALID' };
  }
  if (state.finished) {
    return { state, events: [], error: 'MATCH_ALREADY_FINISHED' };
  }
  if (state.folded[playerIndex]) {
    return { state, events: [], error: 'ACTION_PLAYER_FOLDED' };
  }
  if (playerIndex !== state.currentPlayerIndex) {
    return { state, events: [], error: 'ACTION_NOT_PLAYER_TURN' };
  }

  const nextState = {
    ...state,
    bets: state.bets.slice(),
    stacks: state.stacks.slice(),
    folded: state.folded.slice(),
    history: state.history.slice()
  };
  let nextPlayerIndex = state.currentPlayerIndex;
  let outcome = null;
  const type = action.type;
  const actor = players[playerIndex];

  if (type === 'fold') {
    nextState.folded[playerIndex] = true;
    nextState.history.push({ type: 'fold', seat: actor.seat, phase: nextState.revealedCount });
    nextPlayerIndex = nextActivePlayer(nextState);
    if (countActivePlayers(nextState) === 1) {
      const remainingSeat = nextState.folded.findIndex((folded) => !folded);
      nextState.finished = true;
      outcome = {
        winnerSeats: [players[remainingSeat].seat],
        reason: 'last_player_standing'
      };
    }
  } else if (type === 'bet' || type === 'call' || type === 'check') {
    let amount = 0;
    if (type === 'bet' || type === 'call') {
      amount = Number.isFinite(action.amount) ? Number(action.amount) : 0;
      if (amount < 0) {
        return { state, events: [], error: 'ACTION_INVALID' };
      }
      if (amount > nextState.stacks[playerIndex]) {
        return { state, events: [], error: 'ACTION_NOT_ENOUGH_STACK' };
      }
      nextState.stacks[playerIndex] -= amount;
      nextState.bets[playerIndex] += amount;
      nextState.pot += amount;
    }
    nextState.history.push({
      type,
      seat: actor.seat,
      amount: amount || undefined,
      phase: nextState.revealedCount
    });
    nextPlayerIndex = nextActivePlayer(nextState);
  } else if (type === 'advance_phase') {
    const maxReveal = Math.min(5, nextState.communityCards.length);
    if (nextState.revealedCount >= maxReveal) {
      return { state, events: [], error: 'ACTION_PHASE_COMPLETE' };
    }
    if (nextState.revealedCount === 0) {
      nextState.revealedCount = Math.min(3, maxReveal);
    } else {
      nextState.revealedCount += 1;
    }
    nextState.history.push({ type: 'advance_phase', seat: actor.seat, phase: nextState.revealedCount });
    nextPlayerIndex = nextActivePlayer(nextState);
  } else if (type === 'declare_winner') {
    const winnerSeats = Array.isArray(action.winners)
      ? action.winners.filter((seat) => Number.isInteger(seat) && seat >= 0 && seat < players.length)
      : [];
    if (winnerSeats.length === 0) {
      return { state, events: [], error: 'ACTION_INVALID' };
    }
    const reason = typeof action.reason === 'string' && action.reason.length > 0 ? action.reason : 'declared';
    nextState.history.push({ type: 'declare_winner', seat: actor.seat, winners: winnerSeats.slice(), phase: nextState.revealedCount });
    nextState.finished = true;
    outcome = {
      winnerSeats,
      reason
    };
  } else {
    return { state, events: [], error: 'ACTION_UNSUPPORTED' };
  }

  if (!nextState.finished) {
    nextState.currentPlayerIndex = nextPlayerIndex;
  }

  const events = [
    {
      type: 'action_applied',
      payload: {
        roomId: room.id,
        playerId: actor.id,
        seat: actor.seat,
        role: actor.role,
        action: {
          type,
          amount: action.amount,
          winners: outcome?.winnerSeats
        },
        pot: nextState.pot,
        community: summarizeCommunity(nextState),
        stacks: nextState.stacks.slice(),
        foldedSeats: nextState.folded
          .map((folded, index) => (folded ? players[index].seat : null))
          .filter((seat) => seat !== null)
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
      phase: 'waiting',
      community: [],
      pot: 0,
      stacks: room.players.map((player) => ({ seat: player.seat, stack: player.stack })),
      foldedSeats: [],
      history: []
    };
  }
  return {
    phase: state.finished ? 'showdown' : state.revealedCount === 0 ? 'preflop' : `community_${state.revealedCount}`,
    community: summarizeCommunity(state),
    pot: state.pot,
    stacks: room.players.map((player, index) => ({ seat: player.seat, stack: state.stacks[index] })),
    foldedSeats: state.folded
      .map((folded, index) => (folded ? room.players[index].seat : null))
      .filter((seat) => seat !== null),
    history: summarizeHistory(state),
    currentSeat: state.finished ? null : room.players[state.currentPlayerIndex].seat
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
