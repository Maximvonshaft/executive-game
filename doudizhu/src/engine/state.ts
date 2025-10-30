import produce from 'immer';
import { buildDeck, deal } from './deck';
import { RANK_ORDER, canBeat, parseCombo, rankIndex } from './rules';
import type {
  Card,
  Combo,
  GameConfig,
  GameState,
  GameStateSnapshot,
  Observation,
  PlayerBid,
  PlayerId
} from '../types';

function emptyHands(): Record<PlayerId, Card[]> {
  return { P0: [], P1: [], P2: [] };
}

function nextPlayer(pid: PlayerId): PlayerId {
  return pid === 'P0' ? 'P1' : pid === 'P1' ? 'P2' : 'P0';
}

function snapshot(gs: GameState): GameStateSnapshot {
  return {
    phase: gs.phase,
    hands: {
      P0: [...gs.hands.P0],
      P1: [...gs.hands.P1],
      P2: [...gs.hands.P2]
    },
    landlord: gs.landlord,
    bidBase: gs.bidBase,
    multiple: gs.multiple,
    trick: gs.trick ? {
      leader: gs.trick.leader,
      currentPlayer: gs.trick.currentPlayer,
      combo: gs.trick.combo ? { ...gs.trick.combo, cards: [...gs.trick.combo.cards] } : null,
      lastComboOwner: gs.trick.lastComboOwner,
      passSet: [...gs.trick.passSet]
    } : null,
    bids: gs.bids.map((b) => ({ ...b })),
    currentPlayer: gs.trick?.currentPlayer,
    deck: [...gs.deck],
    upcomingBottom: [...gs.upcomingBottom],
    log: [...gs.log]
  };
}

export function initGame(config: GameConfig = {}): GameState {
  return {
    version: 1,
    phase: 'IDLE',
    deck: [],
    hands: emptyHands(),
    landlord: undefined,
    bids: [],
    bidTurn: undefined,
    bidBase: 1,
    multiple: 1,
    trick: null,
    history: [],
    upcomingBottom: [],
    log: [],
    winner: undefined
  };
}

export function startDeal(gs: GameState, config: GameConfig = {}): GameState {
  return produce(gs, (draft) => {
    const deck = buildDeck(config.seed);
    const { hands, bottom } = deal(deck);
    draft.deck = deck;
    draft.hands = {
      P0: hands.P0.sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank)),
      P1: hands.P1.sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank)),
      P2: hands.P2.sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank))
    };
    draft.phase = 'DEAL';
    draft.landlord = undefined;
    draft.bidBase = 1;
    draft.multiple = 1;
    draft.trick = null;
    draft.bids = [];
    draft.bidTurn = undefined;
    draft.upcomingBottom = bottom;
    draft.winner = undefined;
    draft.history = [];
    draft.log.push('startDeal');
  });
}

export function startBidding(gs: GameState, firstPid: PlayerId): GameState {
  if (gs.phase !== 'DEAL' && gs.phase !== 'IDLE') {
    throw new Error('不能在当前阶段开始叫分');
  }
  return produce(gs, (draft) => {
    draft.phase = 'BIDDING';
    draft.bidTurn = firstPid;
    draft.bids = [];
    draft.bidBase = 1;
    draft.history.push(snapshot(gs));
    draft.log.push(`startBidding:${firstPid}`);
  });
}

function settleBidding(gs: GameState): GameState {
  const highest = gs.bids.reduce<{ score: 0 | 1 | 2 | 3; pid?: PlayerId }>(
    (acc, bid) => {
      if (bid.score > acc.score) {
        return { score: bid.score, pid: bid.pid };
      }
      return acc;
    },
    { score: 0 }
  );
  if (!highest.pid || highest.score === 0) {
    // redeal
    return startDeal(initGame(), {});
  }
  const landlord = highest.pid;
  return produce(gs, (draft) => {
    draft.landlord = landlord;
    draft.bidBase = (highest.score as 1 | 2 | 3) ?? 1;
    draft.phase = 'PLAYING';
    draft.trick = {
      leader: landlord,
      currentPlayer: landlord,
      combo: null,
      lastComboOwner: null,
      passSet: []
    };
    const bottom = draft.upcomingBottom;
    draft.hands[landlord] = [...draft.hands[landlord], ...bottom].sort(
      (a, b) => rankIndex(a.rank) - rankIndex(b.rank)
    );
    draft.upcomingBottom = [];
    draft.history.push(snapshot(gs));
    draft.log.push(`landlord:${landlord}`);
  });
}

export function doBid(gs: GameState, pid: PlayerId, score: 0 | 1 | 2 | 3): GameState {
  if (gs.phase !== 'BIDDING') throw new Error('当前不在叫分阶段');
  if (gs.bidTurn !== pid) throw new Error('未轮到该玩家叫分');
  return produce(gs, (draft) => {
    draft.history.push(snapshot(gs));
    draft.bids.push({ pid, score });
    draft.log.push(`bid:${pid}:${score}`);
    const next = nextPlayer(pid);
    draft.bidTurn = next;
    const highest = draft.bids.reduce<{ score: 0 | 1 | 2 | 3; pid?: PlayerId }>(
      (acc, bid) => {
        if (bid.score > acc.score) return { score: bid.score, pid: bid.pid };
        return acc;
      },
      { score: 0 }
    );
    if (score === 3) {
      Object.assign(draft, settleBidding(draft));
      return;
    }
    if (draft.bids.length >= 3) {
      Object.assign(draft, settleBidding(draft));
    }
  });
}

function ensureTurn(gs: GameState, pid: PlayerId) {
  if (gs.phase !== 'PLAYING') throw new Error('未进入出牌阶段');
  if (!gs.trick) throw new Error('缺少轮信息');
  if (gs.trick.currentPlayer !== pid) throw new Error('未轮到该玩家');
}

export function requestTurn(gs: GameState, pid: PlayerId): {
  requiredType?: Combo['type'] | null;
  mustBeat: boolean;
  trickCombo?: Combo | null;
} {
  ensureTurn(gs, pid);
  const combo = gs.trick?.combo ?? null;
  return {
    requiredType: combo?.type ?? null,
    mustBeat: combo !== null,
    trickCombo: combo
  };
}

function removeCards(hand: Card[], cards: Card[]): Card[] {
  const remain = [...hand];
  for (const card of cards) {
    const idx = remain.findIndex((c) => c.id === card.id);
    if (idx === -1) throw new Error('手牌不足');
    remain.splice(idx, 1);
  }
  return remain;
}

function pushHistory(draft: GameState) {
  draft.history.push(snapshot(draft));
  if (draft.history.length > 5) {
    draft.history.shift();
  }
}

export function play(gs: GameState, pid: PlayerId, cards: Card[]): GameState {
  ensureTurn(gs, pid);
  if (!cards.length) throw new Error('必须选择要出的牌');
  const combo = parseCombo(cards);
  if (!combo) throw new Error('非法牌型');
  if (!gs.trick) throw new Error('缺少轮信息');
  const trick = gs.trick;
  if (!trick.combo) {
    // lead
  } else {
    if (trick.lastComboOwner === pid) {
      throw new Error('轮首不能在同轮再次出牌');
    }
    if (!canBeat(combo, trick.combo)) {
      throw new Error('无法压过当前牌');
    }
  }
  return produce(gs, (draft) => {
    const dTrick = draft.trick!;
    pushHistory(draft);
    draft.hands[pid] = removeCards(draft.hands[pid], cards);
    dTrick.combo = combo;
    dTrick.lastComboOwner = pid;
    dTrick.passSet = [];
    draft.log.push(`play:${pid}:${combo.type}`);
    if (combo.type === 'BOMB' || combo.type === 'ROCKET') {
      draft.multiple *= 2;
    }
    if (draft.hands[pid].length === 0) {
      draft.phase = 'ENDED';
      draft.winner = pid === draft.landlord ? 'LANDLORD' : 'FARMERS';
    }
    dTrick.currentPlayer = nextPlayer(pid);
    if (!dTrick.combo) {
      dTrick.leader = dTrick.currentPlayer;
    }
  });
}

export function pass(gs: GameState, pid: PlayerId): GameState {
  ensureTurn(gs, pid);
  if (!gs.trick) throw new Error('缺少轮信息');
  if (!gs.trick.combo) {
    throw new Error('轮首不能 PASS');
  }
  if (gs.trick.lastComboOwner === pid) {
    throw new Error('上家为自己，不能 PASS');
  }
  return produce(gs, (draft) => {
    const dTrick = draft.trick!;
    pushHistory(draft);
    if (!dTrick.passSet.includes(pid)) {
      dTrick.passSet.push(pid);
    }
    draft.log.push(`pass:${pid}`);
    const next = nextPlayer(pid);
    dTrick.currentPlayer = next;
    if (dTrick.lastComboOwner &&
      dTrick.passSet.includes(nextPlayer(dTrick.lastComboOwner)) &&
      dTrick.passSet.includes(nextPlayer(nextPlayer(dTrick.lastComboOwner)))
    ) {
      // round reset
      dTrick.leader = dTrick.lastComboOwner;
      dTrick.currentPlayer = dTrick.lastComboOwner;
      dTrick.combo = null;
      dTrick.passSet = [];
    }
  });
}

export function hint(gs: GameState, pid: PlayerId): Card[][] {
  ensureTurn(gs, pid);
  const hand = gs.hands[pid];
  const combos = enumerateCombos(hand);
  const base = gs.trick?.combo ?? null;
  const filtered = base
    ? combos.filter((c) => canBeat(c, base))
    : combos;
  if (!filtered.length && base) {
    const bombs = combos.filter((c) => c.type === 'BOMB' || c.type === 'ROCKET');
    bombs.sort((a, b) => rankIndex(a.mainRank) - rankIndex(b.mainRank));
    return bombs.map((c) => c.cards);
  }
  filtered.sort((a, b) => rankIndex(a.mainRank) - rankIndex(b.mainRank));
  return filtered.map((c) => c.cards);
}

export function enumerateCombos(hand: Card[]): Combo[] {
  const combos: Combo[] = [];
  const uniqueCards = [...hand];
  const byRank = new Map<Rank, Card[]>();
  for (const card of uniqueCards) {
    const arr = byRank.get(card.rank) ?? [];
    arr.push(card);
    byRank.set(card.rank, arr);
  }
  for (const cards of byRank.values()) {
    combos.push({ type: 'SINGLE', cards: [cards[0]], mainRank: cards[0].rank });
    if (cards.length >= 2) {
      combos.push({ type: 'PAIR', cards: cards.slice(0, 2), mainRank: cards[0].rank });
    }
    if (cards.length >= 3) {
      combos.push({ type: 'TRIPLE', cards: cards.slice(0, 3), mainRank: cards[0].rank });
    }
    if (cards.length === 4) {
      combos.push({ type: 'BOMB', cards: cards.slice(0, 4), mainRank: cards[0].rank });
    }
  }
  const jokers = byRank.get('SJ') && byRank.get('BJ');
  if (jokers) {
    const sj = byRank.get('SJ')![0];
    const bj = byRank.get('BJ')![0];
    combos.push({ type: 'ROCKET', cards: [sj, bj], mainRank: 'BJ' });
  }

  // triple with attachments
  for (const [rank, cards] of byRank.entries()) {
    if (cards.length >= 3) {
      const triple = cards.slice(0, 3);
      for (const [otherRank, others] of byRank.entries()) {
        if (otherRank === rank) continue;
        combos.push({
          type: 'TRIPLE_WITH_1',
          cards: [...triple, others[0]],
          mainRank: rank
        });
        if (others.length >= 2) {
          combos.push({
            type: 'TRIPLE_WITH_2',
            cards: [...triple, ...others.slice(0, 2)],
            mainRank: rank
          });
        }
      }
    }
  }

  // four with attachments
  for (const [rank, cards] of byRank.entries()) {
    if (cards.length === 4) {
      const singles = [...hand.filter((c) => c.rank !== rank)];
      if (singles.length >= 2) {
        combos.push({
          type: 'FOUR_WITH_2',
          cards: [...cards, singles[0], singles[1]],
          mainRank: rank,
          meta: { wing: 'SINGLES', size: 1 }
        });
      }
      const pairs = Array.from(byRank.entries())
        .filter(([r, arr]) => r !== rank && arr.length >= 2)
        .map(([, arr]) => arr.slice(0, 2));
      if (pairs.length >= 2) {
        combos.push({
          type: 'FOUR_WITH_PAIRS',
          cards: [...cards, ...pairs[0], ...pairs[1]],
          mainRank: rank,
          meta: { wing: 'PAIRS', size: 2 }
        });
      }
    }
  }

  // sequences
  const straightRanks = RANK_ORDER.slice(0, RANK_ORDER.indexOf('2'));
  const rankSet = new Set(hand.map((c) => c.rank));
  const straightCards = straightRanks
    .filter((r) => rankSet.has(r))
    .map((rank) => ({ rank, cards: byRank.get(rank)! }));
  for (let i = 0; i < straightCards.length; i++) {
    for (let j = i + 5; j <= straightCards.length; j++) {
      const slice = straightCards.slice(i, j);
      if (slice.length < 5) continue;
      const expectedLast = rankIndex(slice[0].rank) + slice.length - 1;
      if (rankIndex(slice[slice.length - 1].rank) !== expectedLast) break;
      combos.push({
        type: 'STRAIGHT',
        cards: slice.flatMap((item) => [item.cards[0]]),
        mainRank: slice[slice.length - 1].rank,
        length: slice.length
      });
    }
  }

  // pair sequences
  const pairRanks = straightCards.filter((item) => item.cards.length >= 2);
  for (let i = 0; i < pairRanks.length; i++) {
    for (let j = i + 3; j <= pairRanks.length; j++) {
      const slice = pairRanks.slice(i, j);
      if (slice.length < 3) continue;
      const expectedLast = rankIndex(slice[0].rank) + slice.length - 1;
      if (rankIndex(slice[slice.length - 1].rank) !== expectedLast) break;
      combos.push({
        type: 'PAIR_SEQUENCE',
        cards: slice.flatMap((item) => item.cards.slice(0, 2)),
        mainRank: slice[slice.length - 1].rank,
        length: slice.length
      });
    }
  }

  // triple sequences and wings
  const tripleRanks = straightCards.filter((item) => item.cards.length >= 3);
  for (let i = 0; i < tripleRanks.length; i++) {
    for (let j = i + 2; j <= tripleRanks.length; j++) {
      const slice = tripleRanks.slice(i, j);
      if (slice.length < 2) continue;
      const expectedLast = rankIndex(slice[0].rank) + slice.length - 1;
      if (rankIndex(slice[slice.length - 1].rank) !== expectedLast) break;
      const tripleCards = slice.flatMap((item) => item.cards.slice(0, 3));
      combos.push({
        type: 'TRIPLE_SEQUENCE',
        cards: tripleCards,
        mainRank: slice[slice.length - 1].rank,
        length: slice.length,
        meta: { size: slice.length, wing: 'NONE' }
      });
      const singlesPool = hand.filter((c) => !slice.some((item) => item.cards.includes(c)));
      if (singlesPool.length >= slice.length) {
        combos.push({
          type: 'TRIPLE_SEQ_W_SINGLES',
          cards: [...tripleCards, ...singlesPool.slice(0, slice.length)],
          mainRank: slice[slice.length - 1].rank,
          length: slice.length,
          meta: { size: slice.length, wing: 'SINGLES' }
        });
      }
      const pairPool = Array.from(byRank.entries())
        .filter(([rank]) => !slice.some((item) => item.rank === rank) && rank !== 'SJ' && rank !== 'BJ')
        .map(([rank, cards]) => ({ rank, cards }))
        .filter((item) => item.cards.length >= 2);
      if (pairPool.length >= slice.length) {
        const wings: Card[] = [];
        for (let k = 0; k < slice.length; k++) {
          wings.push(...pairPool[k].cards.slice(0, 2));
        }
        combos.push({
          type: 'TRIPLE_SEQ_W_PAIRS',
          cards: [...tripleCards, ...wings],
          mainRank: slice[slice.length - 1].rank,
          length: slice.length,
          meta: { size: slice.length, wing: 'PAIRS' }
        });
      }
    }
  }

  return combos;
}

export function isSideWin(gs: GameState): { win: boolean; side?: 'LANDLORD' | 'FARMERS' } {
  if (gs.phase !== 'ENDED' || !gs.winner) {
    return { win: false };
  }
  return { win: true, side: gs.winner };
}

export function makeObservation(gs: GameState, pid: PlayerId): Observation {
  return {
    me: pid,
    myHand: gs.hands[pid],
    public: {
      trickCombo: gs.trick?.combo ?? null,
      lastComboOwner: gs.trick?.lastComboOwner ?? null,
      passSet: gs.trick?.passSet ?? [],
      remainMap: {
        P0: gs.hands.P0.length,
        P1: gs.hands.P1.length,
        P2: gs.hands.P2.length
      },
      landlordId: gs.landlord,
      multiple: gs.multiple
    },
    required: {
      type: gs.trick?.combo?.type ?? null,
      mustBeat: !!gs.trick?.combo
    }
  };
}

export function restoreFromSnapshot(gs: GameState, snap: GameStateSnapshot): GameState {
  return {
    ...gs,
    phase: snap.phase,
    hands: {
      P0: [...snap.hands.P0],
      P1: [...snap.hands.P1],
      P2: [...snap.hands.P2]
    },
    landlord: snap.landlord,
    bidBase: snap.bidBase,
    multiple: snap.multiple,
    trick: snap.trick
      ? {
          leader: snap.trick.leader,
          currentPlayer: snap.trick.currentPlayer,
          combo: snap.trick.combo
            ? { ...snap.trick.combo, cards: [...snap.trick.combo.cards] }
            : null,
          lastComboOwner: snap.trick.lastComboOwner,
          passSet: [...snap.trick.passSet]
        }
      : null,
    bids: snap.bids.map((b) => ({ ...b })),
    deck: [...snap.deck],
    upcomingBottom: [...snap.upcomingBottom],
    log: [...snap.log]
  };
}
