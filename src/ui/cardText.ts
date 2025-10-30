import { Card, RANK_LABEL, SUIT_SYMBOL } from '../core/types';

export function formatCard(card: Card): string {
  const suit = SUIT_SYMBOL[card.suit];
  return card.suit === 'joker' ? RANK_LABEL[card.rank] : `${suit}${RANK_LABEL[card.rank]}`;
}
