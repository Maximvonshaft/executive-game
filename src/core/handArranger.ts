import { Card, CardRank, GroupedHand, HandGroup, RANK_LABEL, RANK_ORDER } from './types';

function bucketByRank(cards: Card[]): Map<CardRank, Card[]> {
  const map = new Map<CardRank, Card[]>();
  for (const card of cards) {
    const list = map.get(card.rank) ?? [];
    list.push(card);
    map.set(card.rank, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }
  return map;
}

function takeCards(buckets: Map<CardRank, Card[]>, rank: CardRank, count: number): Card[] {
  const bucket = buckets.get(rank) ?? [];
  const taken = bucket.splice(0, count);
  if (bucket.length === 0) {
    buckets.delete(rank);
  }
  return taken;
}

function extractSequences(
  buckets: Map<CardRank, Card[]>,
  requiredCount: number,
  minLength: number,
  type: HandGroup['type']
): HandGroup[] {
  const groups: HandGroup[] = [];
  const allowedRanks = RANK_ORDER.filter((rank) => rank < 15);
  let index = 0;

  while (index < allowedRanks.length) {
    const startRank = allowedRanks[index];
    if ((buckets.get(startRank)?.length ?? 0) < requiredCount) {
      index += 1;
      continue;
    }

    let endIndex = index;
    while (
      endIndex < allowedRanks.length &&
      (buckets.get(allowedRanks[endIndex])?.length ?? 0) >= requiredCount
    ) {
      endIndex += 1;
    }

    const run = allowedRanks.slice(index, endIndex);
    if (run.length >= minLength) {
      let canExtract = true;
      while (canExtract) {
        canExtract = run.every((rank) => (buckets.get(rank)?.length ?? 0) >= requiredCount);
        if (!canExtract) {
          break;
        }
        const cards: Card[] = [];
        for (const rank of run) {
          cards.push(...takeCards(buckets, rank, requiredCount));
        }
        const label = `${describeRank(run[0])}→${describeRank(run[run.length - 1])}`;
        groups.push({
          type,
          label,
          cards
        });
      }
    }

    index = endIndex + 1;
  }

  return groups;
}

function describeRank(rank: CardRank): string {
  return RANK_LABEL[rank];
}

function collectRemaining(
  buckets: Map<CardRank, Card[]>,
  type: HandGroup['type'],
  size: number
): HandGroup[] {
  const groups: HandGroup[] = [];
  const ranks = [...buckets.keys()].sort(
    (a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b)
  );
  for (const rank of ranks) {
    const bucket = buckets.get(rank) ?? [];
    while (bucket.length >= size) {
      const cards = takeCards(buckets, rank, size);
      groups.push({
        type,
        label: `${describeRank(rank)}${size > 1 ? `×${size}` : ''}`,
        cards
      });
    }
  }
  return groups;
}

export function autoArrangeHand(cards: Card[]): GroupedHand {
  const buckets = bucketByRank(cards);
  const groups: HandGroup[] = [];

  groups.push(...extractSequences(buckets, 1, 5, 'straight'));
  groups.push(...extractSequences(buckets, 2, 3, 'pairSequence'));
  groups.push(...extractSequences(buckets, 3, 2, 'plane'));

  groups.push(...collectRemaining(buckets, 'bomb', 4));
  groups.push(...collectRemaining(buckets, 'triple', 3));
  groups.push(...collectRemaining(buckets, 'pair', 2));

  for (const rank of [...buckets.keys()]) {
    const bucket = buckets.get(rank) ?? [];
    if (bucket.length === 0) {
      continue;
    }
    groups.push({
      type: 'unsorted',
      label: describeRank(rank),
      cards: takeCards(buckets, rank, bucket.length)
    });
  }

  return groups;
}
