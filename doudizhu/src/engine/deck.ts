import { Card, PlayerId, Rank, Suit } from '../types';

const RANKS: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const SUITS: Suit[] = ['S', 'H', 'C', 'D'];

const JOKERS: Card[] = [
  { id: 'SJ', rank: 'SJ', suit: 'J' },
  { id: 'BJ', rank: 'BJ', suit: 'J' }
];

export function buildDeck(seed?: number): Card[] {
  const cards: Card[] = [];
  let counter = 0;
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      cards.push({ id: `${rank}-${suit}-${counter++}`, rank, suit });
    }
  }
  cards.push(...JOKERS.map((j, idx) => ({ ...j, id: `${j.id}-${idx}` })));
  return shuffle(cards, seed);
}

export function shuffle(cards: Card[], seed: number = Date.now()): Card[] {
  const arr = [...cards];
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  const next = () => {
    state = (state * 16807) % 2147483647;
    return state;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const r = next() % (i + 1);
    [arr[i], arr[r]] = [arr[r], arr[i]];
  }
  return arr;
}

export function deal(deck: Card[]): {
  hands: Record<PlayerId, Card[]>;
  bottom: Card[];
} {
  if (deck.length !== 54) {
    throw new Error('Deck must contain 54 cards');
  }
  const hands: Record<PlayerId, Card[]> = {
    P0: [],
    P1: [],
    P2: []
  };
  for (let i = 0; i < 51; i++) {
    const pid: PlayerId = (['P0', 'P1', 'P2'] as PlayerId[])[i % 3];
    hands[pid].push(deck[i]);
  }
  return { hands, bottom: deck.slice(51) };
}
