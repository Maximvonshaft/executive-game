import { describe, expect, it } from 'vitest';
import { autoArrangeHand } from '../handArranger';
import { Card, CardRank } from '../types';

function makeCard(rank: CardRank, suit: Card['suit'] = 'spade', index = 0): Card {
  return {
    id: `${rank}-${suit}-${index}`,
    rank,
    suit
  };
}

describe('autoArrangeHand', () => {
  it('优先识别顺子', () => {
    const ranks: CardRank[] = [3, 4, 5, 6, 7];
    const groups = autoArrangeHand(ranks.map((rank, index) => makeCard(rank, 'heart', index)));
    expect(groups[0].type).toBe('straight');
    expect(groups[0].cards).toHaveLength(5);
  });

  it('可以找到连对', () => {
    const ranks: CardRank[] = [3, 3, 4, 4, 5, 5];
    const cards = ranks.map((rank, index) => makeCard(rank, 'club', index));
    const groups = autoArrangeHand(cards);
    expect(groups[0].type).toBe('pairSequence');
    expect(groups[0].cards).toHaveLength(6);
  });

  it('保留剩余牌为单张', () => {
    const ranks: CardRank[] = [3, 4, 5, 9];
    const groups = autoArrangeHand(ranks.map((rank, index) => makeCard(rank, 'spade', index)));
    const tail = groups[groups.length - 1];
    expect(tail.type).toBe('unsorted');
    expect(tail.cards).toHaveLength(1);
  });
});
