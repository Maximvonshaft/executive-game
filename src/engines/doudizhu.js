const PLAYER_COUNT = 3;

const SUITS = ['S', 'H', 'C', 'D'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

function buildDeck() {
  const deck = [];
  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
      deck.push(`${suit}${rank}`);
    });
  });
  deck.push('BJ');
  deck.push('RJ');
  return deck;
}

function assignSeats({ playerIds }) {
  if (playerIds.length !== PLAYER_COUNT) {
    throw new Error('Doudizhu requires exactly three players');
  }
  return playerIds.map((_, index) => ({
    seat: index,
    role: index === 0 ? 'landlord' : 'farmer'
  }));
}

function describePlayer(player) {
  return {
    id: player.id,
    seat: player.seat,
    role: player.role,
    ready: player.ready
  };
}

function dealHands(deck) {
  return [
    deck.slice(0, 17),
    deck.slice(17, 34),
    deck.slice(34, 51)
  ];
}

function createInitialState() {
  const deck = buildDeck();
  const hands = dealHands(deck).map((cards) => cards.slice());
  const bottomCards = deck.slice(51);
  return {
    deck,
    hands,
    bottomCards,
    history: [],
    currentPlayerIndex: 0,
    trickLeader: 0,
    lastAction: null,
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
      role: player.role
    })),
    bottomCardCount: 3,
    landlordSeat: 0
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
    role: current.role
  };
}

function cloneHands(hands) {
  return hands.map((cards) => cards.slice());
}

function sanitizeCards(cards) {
  return cards ? cards.slice() : [];
}

function toHistoryEntry({ type, playerIndex, cards }) {
  return {
    type,
    seat: playerIndex,
    cards: sanitizeCards(cards)
  };
}

function removeCards(hand, cards) {
  const remaining = hand.slice();
  for (const card of cards) {
    const idx = remaining.indexOf(card);
    if (idx === -1) {
      return null;
    }
    remaining.splice(idx, 1);
  }
  return remaining;
}

function advanceTurn(state, playerCount) {
  return (state.currentPlayerIndex + 1) % playerCount;
}

function summarizeHandCounts(room, state) {
  return room.players.map((player, index) => ({
    seat: player.seat,
    count: state.hands[index].length
  }));
}

function summarizeHistory(state) {
  return state.history.map((entry) => ({
    type: entry.type,
    seat: entry.seat,
    cards: sanitizeCards(entry.cards)
  }));
}

function summarizeLastAction(room, state) {
  if (!state.lastAction) {
    return null;
  }
  const { type, cards, playerIndex } = state.lastAction;
  return {
    type,
    cards: sanitizeCards(cards),
    seat: room.players[playerIndex].seat
  };
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
  const nextState = {
    ...state,
    hands: cloneHands(state.hands),
    history: state.history.slice()
  };
  let nextPlayerIndex = playerIndex;
  let outcome = null;
  const type = action.type;

  if (type === 'play_cards') {
    const cards = Array.isArray(action.cards) ? action.cards.slice() : [];
    if (cards.length === 0) {
      return { state, events: [], error: 'ACTION_INVALID' };
    }
    const updatedHand = removeCards(nextState.hands[playerIndex], cards);
    if (!updatedHand) {
      return { state, events: [], error: 'ACTION_CARD_NOT_OWNED' };
    }
    nextState.hands[playerIndex] = updatedHand;
    nextState.history.push(toHistoryEntry({ type: 'play_cards', playerIndex, cards }));
    nextState.lastAction = { type: 'play_cards', cards, playerIndex };
    nextState.trickLeader = playerIndex;
    nextPlayerIndex = advanceTurn(state, players.length);
    if (nextState.hands[playerIndex].length === 0) {
      nextState.finished = true;
      outcome = {
        winnerSeats: [players[playerIndex].seat],
        reason: 'hand_empty'
      };
    }
  } else if (type === 'pass') {
    if (!state.lastAction) {
      return { state, events: [], error: 'ACTION_PASS_NOT_ALLOWED' };
    }
    nextState.history.push(toHistoryEntry({ type: 'pass', playerIndex }));
    nextPlayerIndex = advanceTurn(state, players.length);
    if (nextPlayerIndex === state.lastAction.playerIndex) {
      nextState.lastAction = null;
      nextState.trickLeader = nextPlayerIndex;
    }
  } else if (type === 'declare_winner') {
    const winnerSeats = Array.isArray(action.winners)
      ? action.winners.filter((seat) => Number.isInteger(seat) && seat >= 0 && seat < players.length)
      : [];
    if (winnerSeats.length === 0) {
      return { state, events: [], error: 'ACTION_INVALID' };
    }
    const reason = typeof action.reason === 'string' && action.reason.length > 0 ? action.reason : 'declared';
    nextState.history.push(toHistoryEntry({ type: 'declare_winner', playerIndex, cards: [] }));
    nextState.finished = true;
    outcome = {
      winnerSeats,
      reason
    };
  } else {
    return { state, events: [], error: 'ACTION_UNSUPPORTED' };
  }

  nextState.currentPlayerIndex = nextState.finished ? state.currentPlayerIndex : nextPlayerIndex;

  const actingPlayer = players[playerIndex];
  const events = [
    {
      type: 'action_applied',
      payload: {
        roomId: room.id,
        playerId: actingPlayer.id,
        seat: actingPlayer.seat,
        role: actingPlayer.role,
        action: {
          type,
          cards: type === 'play_cards' ? sanitizeCards(action.cards) : undefined,
          winners: type === 'declare_winner' ? outcome?.winnerSeats || [] : undefined,
          reason: type === 'declare_winner' ? outcome?.reason : undefined
        },
        handCounts: summarizeHandCounts(room, nextState),
        lastAction: summarizeLastAction(room, nextState)
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
    ? result.winnerSeats.map((seat) => room.players.find((player) => player.seat === seat)?.id).filter(Boolean)
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
      handCounts: [],
      lastAction: null,
      currentSeat: null,
      history: []
    };
  }
  return {
    phase: state.finished ? 'settlement' : 'play',
    handCounts: summarizeHandCounts(room, state),
    lastAction: summarizeLastAction(room, state),
    currentSeat: state.finished ? null : room.players[state.currentPlayerIndex].seat,
    history: summarizeHistory(state),
    bottomCardCount: state.bottomCards.length
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
