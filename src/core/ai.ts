import { Card, CardRank } from './types';

const RANK_WEIGHT: Record<CardRank, number> = {
  3: 1,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 6,
  9: 7,
  10: 8,
  11: 9,
  12: 10,
  13: 11,
  14: 13,
  15: 15,
  16: 20,
  17: 22
};

export function evaluateLandlordScore(hand: Card[]): number {
  const counts = new Map<CardRank, number>();
  let score = 0;
  for (const card of hand) {
    score += RANK_WEIGHT[card.rank];
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  }
  for (const [, count] of counts) {
    if (count >= 4) {
      score += 12;
    } else if (count === 3) {
      score += 5;
    } else if (count === 2) {
      score += 2;
    }
  }
  const highCards = hand.filter((card) => card.rank >= 14).length;
  score += highCards * 4;
  return score;
}

export function shouldGrabLandlord(hand: Card[]): boolean {
  const score = evaluateLandlordScore(hand);
  return score >= 60;
}
