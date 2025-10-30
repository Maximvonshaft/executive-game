import { Card, CardRank, Play, RANK_ORDER } from './types';

function rankIndex(rank: CardRank): number {
  return RANK_ORDER.indexOf(rank);
}

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank));
}

function buildCountMap(cards: Card[]): Map<CardRank, number> {
  const counts = new Map<CardRank, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  }
  return counts;
}

function isSequential(ranks: CardRank[]): boolean {
  if (ranks.length <= 1) {
    return true;
  }
  for (let i = 1; i < ranks.length; i += 1) {
    if (rankIndex(ranks[i]) - rankIndex(ranks[i - 1]) !== 1) {
      return false;
    }
  }
  return true;
}

function hasNoHighRanks(ranks: CardRank[]): boolean {
  return ranks.every((rank) => rank < 15);
}

function extractTriples(counts: Map<CardRank, number>): CardRank[] {
  return RANK_ORDER.filter((rank) => (counts.get(rank) ?? 0) >= 3 && rank < 15);
}

function cloneCounts(source: Map<CardRank, number>): Map<CardRank, number> {
  const clone = new Map<CardRank, number>();
  for (const [rank, count] of source) {
    clone.set(rank, count);
  }
  return clone;
}

function countsSum(counts: Map<CardRank, number>): number {
  let total = 0;
  for (const [, count] of counts) {
    total += count;
  }
  return total;
}

function tryStraight(cards: Card[], counts: Map<CardRank, number>): Play | null {
  if (cards.length < 5) {
    return null;
  }
  if (counts.size !== cards.length) {
    return null;
  }
  const sorted = sortCards(cards);
  const ranks = sorted.map((card) => card.rank);
  if (!hasNoHighRanks(ranks)) {
    return null;
  }
  if (!isSequential(ranks)) {
    return null;
  }
  return {
    type: 'straight',
    cards: sorted,
    mainRank: ranks[ranks.length - 1]
  };
}

function tryPairSequence(cards: Card[], counts: Map<CardRank, number>): Play | null {
  if (cards.length < 6 || cards.length % 2 !== 0) {
    return null;
  }
  const expectedPairs = cards.length / 2;
  if (counts.size !== expectedPairs) {
    return null;
  }
  const ranks = [...counts.keys()].sort((a, b) => rankIndex(a) - rankIndex(b));
  if (!hasNoHighRanks(ranks)) {
    return null;
  }
  if (!ranks.every((rank) => counts.get(rank) === 2)) {
    return null;
  }
  if (!isSequential(ranks)) {
    return null;
  }
  return {
    type: 'pairSequence',
    cards: sortCards(cards),
    mainRank: ranks[ranks.length - 1]
  };
}

function tryPlane(cards: Card[], counts: Map<CardRank, number>): Play | null {
  if (cards.length < 6) {
    return null;
  }
  const tripleRanks = extractTriples(counts);
  if (tripleRanks.length < 2) {
    return null;
  }
  const sortedTriple = tripleRanks.sort((a, b) => rankIndex(a) - rankIndex(b));
  if (!isSequential(sortedTriple)) {
    return null;
  }
  const tripleCount = sortedTriple.length;
  const tripleCardsNeeded = tripleCount * 3;
  const baseCounts = cloneCounts(counts);
  for (const rank of sortedTriple) {
    baseCounts.set(rank, (baseCounts.get(rank) ?? 0) - 3);
    if ((baseCounts.get(rank) ?? 0) === 0) {
      baseCounts.delete(rank);
    }
  }

  if (cards.length === tripleCardsNeeded) {
    return {
      type: 'plane',
      cards: sortCards(cards),
      mainRank: sortedTriple[sortedTriple.length - 1]
    };
  }

  const remaining = countsSum(baseCounts);
  if (cards.length === tripleCardsNeeded + tripleCount) {
    if (remaining !== tripleCount) {
      return null;
    }
    return {
      type: 'planeWithSingles',
      cards: sortCards(cards),
      mainRank: sortedTriple[sortedTriple.length - 1]
    };
  }

  if (cards.length === tripleCardsNeeded + tripleCount * 2) {
    const pairs = Array.from(baseCounts.values()).filter((value) => value === 2).length;
    if (pairs * 2 !== remaining || pairs !== tripleCount) {
      return null;
    }
    return {
      type: 'planeWithPairs',
      cards: sortCards(cards),
      mainRank: sortedTriple[sortedTriple.length - 1]
    };
  }

  return null;
}

function tryFourWithAttachments(cards: Card[], counts: Map<CardRank, number>): Play | null {
  if (![6, 8].includes(cards.length)) {
    return null;
  }
  const quadruples = [...counts.entries()].filter(([, value]) => value === 4);
  if (quadruples.length !== 1) {
    return null;
  }
  const [rank] = quadruples[0];
  if (cards.length === 6) {
    return {
      type: 'fourWithTwoSingles',
      cards: sortCards(cards),
      mainRank: rank
    };
  }
  const pairCount = [...counts.values()].filter((value) => value === 2).length;
  if (pairCount === 2) {
    return {
      type: 'fourWithTwoPairs',
      cards: sortCards(cards),
      mainRank: rank
    };
  }
  return null;
}

function tryBomb(cards: Card[], counts: Map<CardRank, number>): Play | null {
  if (cards.length !== 4) {
    return null;
  }
  if (counts.size === 1 && [...counts.values()][0] === 4) {
    const rank = [...counts.keys()][0];
    return {
      type: 'bomb',
      cards: sortCards(cards),
      mainRank: rank
    };
  }
  return null;
}

function tryTripleCombos(cards: Card[], counts: Map<CardRank, number>): Play | null {
  if (cards.length < 3) {
    return null;
  }
  const tripleRanks = [...counts.entries()].filter(([, value]) => value === 3);
  if (tripleRanks.length !== 1) {
    return null;
  }
  const [rank] = tripleRanks[0];
  if (cards.length === 3) {
    return {
      type: 'triple',
      cards: sortCards(cards),
      mainRank: rank
    };
  }
  if (cards.length === 4) {
    return {
      type: 'tripleWithSingle',
      cards: sortCards(cards),
      mainRank: rank
    };
  }
  if (cards.length === 5) {
    const hasPair = [...counts.values()].includes(2);
    if (hasPair) {
      return {
        type: 'tripleWithPair',
        cards: sortCards(cards),
        mainRank: rank
      };
    }
  }
  return null;
}

function tryRocket(cards: Card[], counts: Map<CardRank, number>): Play | null {
  if (cards.length !== 2) {
    return null;
  }
  const ranks = [...counts.keys()].sort((a, b) => rankIndex(a) - rankIndex(b));
  if (ranks.length === 2 && ranks.includes(16) && ranks.includes(17)) {
    return {
      type: 'rocket',
      cards: sortCards(cards),
      mainRank: 17
    };
  }
  return null;
}

function tryPair(cards: Card[], counts: Map<CardRank, number>): Play | null {
  if (cards.length !== 2) {
    return null;
  }
  const [[rank, count]] = [...counts.entries()];
  if (count === 2) {
    return {
      type: 'pair',
      cards: sortCards(cards),
      mainRank: rank
    };
  }
  return null;
}

export function analyzeCombination(cards: Card[]): Play | null {
  if (cards.length === 0) {
    return null;
  }
  const counts = buildCountMap(cards);
  if (cards.length === 1) {
    return {
      type: 'single',
      cards: sortCards(cards),
      mainRank: cards[0].rank
    };
  }
  return (
    tryRocket(cards, counts) ??
    tryBomb(cards, counts) ??
    tryPair(cards, counts) ??
    tryTripleCombos(cards, counts) ??
    tryStraight(cards, counts) ??
    tryPairSequence(cards, counts) ??
    tryPlane(cards, counts) ??
    tryFourWithAttachments(cards, counts)
  );
}

export function comparePlays(a: Play, b: Play): number {
  if (a.type === 'rocket' && b.type !== 'rocket') {
    return 1;
  }
  if (b.type === 'rocket' && a.type !== 'rocket') {
    return -1;
  }
  if (a.type === 'bomb' && b.type !== 'bomb') {
    return 1;
  }
  if (b.type === 'bomb' && a.type !== 'bomb') {
    return -1;
  }
  if (a.type !== b.type) {
    return 0;
  }
  return Math.sign(rankIndex(a.mainRank) - rankIndex(b.mainRank));
}

export function canBeat(current: Play | null, candidate: Play): boolean {
  if (!current) {
    return true;
  }
  const result = comparePlays(candidate, current);
  return result > 0;
}

export function sortCardsAscending(cards: Card[]): Card[] {
  return sortCards(cards);
}
