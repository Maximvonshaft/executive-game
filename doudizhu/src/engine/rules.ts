import { Card, Combo, ComboType, Rank } from '../types';

export const RANK_ORDER: Rank[] = [
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
  '2',
  'SJ',
  'BJ'
];

const STRAIGHT_MAX_INDEX = RANK_ORDER.indexOf('A');

export function rankIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

export function isStraightSequence(ranks: Rank[]): boolean {
  if (ranks.length < 2) return true;
  for (let i = 1; i < ranks.length; i++) {
    if (rankIndex(ranks[i]) !== rankIndex(ranks[i - 1]) + 1) {
      return false;
    }
  }
  return true;
}

function withoutDuplicates(ranks: Rank[]): boolean {
  return new Set(ranks).size === ranks.length;
}

export function parseCombo(cards: Card[]): Combo | null {
  if (!cards.length) return null;
  const sorted = [...cards].sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank));
  const ranks = sorted.map((c) => c.rank);
  const counts = new Map<Rank, number>();
  for (const r of ranks) {
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const entries = [...counts.entries()].sort((a, b) => rankIndex(a[0]) - rankIndex(b[0]));
  const len = cards.length;

  if (len === 1) {
    return { type: 'SINGLE', cards: sorted, mainRank: sorted[0].rank };
  }
  if (len === 2) {
    if (ranks[0] === 'SJ' && ranks[1] === 'BJ') {
      return { type: 'ROCKET', cards: sorted, mainRank: 'BJ' };
    }
    if (entries.length === 1 && entries[0][1] === 2) {
      return { type: 'PAIR', cards: sorted, mainRank: entries[0][0] };
    }
    return null;
  }
  if (len === 3 && entries.length === 1 && entries[0][1] === 3) {
    return { type: 'TRIPLE', cards: sorted, mainRank: entries[0][0] };
  }
  if (len === 4) {
    if (entries.length === 1 && entries[0][1] === 4) {
      return { type: 'BOMB', cards: sorted, mainRank: entries[0][0] };
    }
    if (entries.some(([, count]) => count === 3)) {
      const tripleRank = entries.find(([, count]) => count === 3)![0];
      return { type: 'TRIPLE_WITH_1', cards: sorted, mainRank: tripleRank };
    }
    return null;
  }
  if (len === 5) {
    if (entries.some(([, count]) => count === 3) && entries.some(([, count]) => count === 2)) {
      const tripleRank = entries.find(([, count]) => count === 3)![0];
      return { type: 'TRIPLE_WITH_2', cards: sorted, mainRank: tripleRank };
    }
  }

  if (len >= 5) {
    if (entries.every(([, count]) => count === 1)) {
      if (rankIndex(ranks[ranks.length - 1]) > STRAIGHT_MAX_INDEX) {
        return null;
      }
      if (!withoutDuplicates(ranks)) {
        return null;
      }
      if (isStraightSequence(ranks)) {
        return {
          type: 'STRAIGHT',
          cards: sorted,
          mainRank: ranks[ranks.length - 1],
          length: len
        };
      }
    }
  }

  if (len >= 6 && len % 2 === 0) {
    const pairCount = len / 2;
    if (pairCount >= 3 && entries.every(([, count]) => count === 2)) {
      const pairRanks = entries.map(([r]) => r);
      if (rankIndex(pairRanks[pairRanks.length - 1]) > STRAIGHT_MAX_INDEX) {
        return null;
      }
      if (!isStraightSequence(pairRanks)) {
        return null;
      }
      return {
        type: 'PAIR_SEQUENCE',
        cards: sorted,
        mainRank: pairRanks[pairRanks.length - 1],
        length: pairCount
      };
    }
  }

  if (len % 3 === 0 && len >= 6) {
    const size = len / 3;
    if (entries.every(([, count]) => count === 3)) {
      const tripleRanks = entries.map(([r]) => r);
      if (tripleRanks.some((r) => rankIndex(r) > STRAIGHT_MAX_INDEX)) {
        return null;
      }
      if (!isStraightSequence(tripleRanks)) {
        return null;
      }
      return {
        type: 'TRIPLE_SEQUENCE',
        cards: sorted,
        mainRank: tripleRanks[tripleRanks.length - 1],
        length: size,
        meta: { size, wing: 'NONE' }
      };
    }
  }

  const byCount = new Map<number, Rank[]>();
  for (const [rank, count] of entries) {
    const arr = byCount.get(count) ?? [];
    arr.push(rank);
    byCount.set(count, arr);
  }

  const tripleRanks = byCount.get(3) ?? [];
  tripleRanks.sort((a, b) => rankIndex(a) - rankIndex(b));

  if (tripleRanks.length >= 2) {
    const triplesAreSeq =
      rankIndex(tripleRanks[tripleRanks.length - 1]) <= STRAIGHT_MAX_INDEX &&
      withoutDuplicates(tripleRanks) &&
      isStraightSequence(tripleRanks);
    if (triplesAreSeq) {
      const wingSingles = byCount.get(1) ?? [];
      const wingPairs = byCount.get(2) ?? [];
      const tripleCount = tripleRanks.length;
      const tripleSize = tripleCount * 3;
      if (len === tripleCount * 4) {
        if (wingSingles.length === tripleCount) {
          return {
            type: 'TRIPLE_SEQ_W_SINGLES',
            cards: sorted,
            mainRank: tripleRanks[tripleRanks.length - 1],
            length: tripleCount,
            meta: { size: tripleCount, wing: 'SINGLES' }
          };
        }
      }
      if (len === tripleCount * 5) {
        if (
          wingPairs.length === tripleCount &&
          wingPairs.every((r) => rankIndex(r) <= STRAIGHT_MAX_INDEX + 1) &&
          withoutDuplicates(wingPairs)
        ) {
          return {
            type: 'TRIPLE_SEQ_W_PAIRS',
            cards: sorted,
            mainRank: tripleRanks[tripleRanks.length - 1],
            length: tripleCount,
            meta: { size: tripleCount, wing: 'PAIRS' }
          };
        }
      }
      if (len === tripleSize + 2) {
        const fourRank = tripleRanks.find((r) => (counts.get(r) ?? 0) === 4);
        if (fourRank) {
          // handled by four with pairs below
        }
      }
    }
  }

  if (len === 6) {
    const fourRank = entries.find(([, count]) => count === 4)?.[0];
    if (fourRank) {
      const singles = entries.filter(([, count]) => count === 1);
      if (singles.length === 2) {
        return {
          type: 'FOUR_WITH_2',
          cards: sorted,
          mainRank: fourRank,
          meta: { wing: 'SINGLES', size: 1 }
        };
      }
    }
  }

  if (len === 8) {
    const fourRank = entries.find(([, count]) => count === 4)?.[0];
    if (fourRank) {
      const pairs = entries.filter(([, count]) => count === 2).map(([rank]) => rank);
      if (pairs.length === 2 && withoutDuplicates(pairs)) {
        return {
          type: 'FOUR_WITH_PAIRS',
          cards: sorted,
          mainRank: fourRank,
          meta: { wing: 'PAIRS', size: 2 }
        };
      }
    }
  }

  return null;
}

export function sameShape(a: Combo, b: Combo): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'STRAIGHT' || a.type === 'PAIR_SEQUENCE' || a.type === 'TRIPLE_SEQUENCE') {
    return a.length === b.length;
  }
  if (a.type === 'TRIPLE_SEQ_W_SINGLES' || a.type === 'TRIPLE_SEQ_W_PAIRS') {
    return a.length === b.length && a.meta?.wing === b.meta?.wing;
  }
  if (a.type === 'FOUR_WITH_2' || a.type === 'FOUR_WITH_PAIRS') {
    return a.meta?.wing === b.meta?.wing;
  }
  return true;
}

export function canBeat(candidate: Combo, base?: Combo | null): boolean {
  if (!base) return true;
  if (candidate.type === 'ROCKET') return true;
  if (base.type === 'ROCKET') return false;
  if (candidate.type === 'BOMB' && base.type !== 'BOMB') return true;
  if (candidate.type !== 'BOMB' && base.type === 'BOMB') return false;
  if (candidate.type === 'BOMB' && base.type === 'BOMB') {
    return rankIndex(candidate.mainRank) > rankIndex(base.mainRank);
  }
  if (!sameShape(candidate, base)) return false;
  return rankIndex(candidate.mainRank) > rankIndex(base.mainRank);
}
