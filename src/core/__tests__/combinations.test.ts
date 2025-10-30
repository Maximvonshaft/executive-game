import { describe, expect, it } from 'vitest';
import { analyzeCombination, comparePlays } from '../combinations';
import { Card, CardRank } from '../types';

function card(rank: CardRank, index = 0): Card {
  return {
    id: `${rank}-${index}`,
    rank,
    suit: rank >= 16 ? 'joker' : 'spade'
  };
}

describe('analyzeCombination', () => {
  it('识别顺子', () => {
    const play = analyzeCombination([3, 4, 5, 6, 7].map((rank, idx) => card(rank as CardRank, idx)));
    expect(play?.type).toBe('straight');
  });

  it('识别连对', () => {
    const play = analyzeCombination([3, 3, 4, 4, 5, 5].map((rank, idx) => card(rank as CardRank, idx)));
    expect(play?.type).toBe('pairSequence');
  });

  it('识别飞机', () => {
    const play = analyzeCombination([3, 3, 3, 4, 4, 4].map((rank, idx) => card(rank as CardRank, idx)));
    expect(play?.type).toBe('plane');
  });

  it('火箭最大', () => {
    const rocket = analyzeCombination([16, 17].map((rank, idx) => card(rank as CardRank, idx)));
    const bomb = analyzeCombination([9, 9, 9, 9].map((rank, idx) => card(rank as CardRank, idx)));
    expect(rocket).not.toBeNull();
    expect(bomb).not.toBeNull();
    if (rocket && bomb) {
      expect(comparePlays(rocket, bomb)).toBeGreaterThan(0);
    }
  });
});
