import { Card, CardRank, RANK_ORDER, SUITS } from './types';
import { mulberry32, shuffleInPlace } from './random';

export interface DealResult {
  players: Card[][];
  bottomCards: Card[];
  seed: number;
}

export function createDeck(seed: number): Card[] {
  const deck: Card[] = [];
  let id = 0;
  for (const suit of SUITS) {
    for (let i = 0; i < 13; i += 1) {
      const rank = (i + 3) as CardRank;
      deck.push({
        id: `${seed}-${id}`,
        suit,
        rank
      });
      id += 1;
    }
  }
  // Jokers
  deck.push({ id: `${seed}-${id++}`, suit: 'joker', rank: 16 });
  deck.push({ id: `${seed}-${id++}`, suit: 'joker', rank: 17 });
  return deck;
}

export function dealCards(seed: number): DealResult {
  const deck = createDeck(seed);
  const random = mulberry32(seed);
  shuffleInPlace(deck, random);
  const players: Card[][] = [[], [], []];
  const bottomCards: Card[] = [];

  deck.forEach((card, index) => {
    if (index >= 51) {
      bottomCards.push(card);
    } else {
      players[index % 3].push(card);
    }
  });

  for (const hand of players) {
    hand.sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));
  }

  return { players, bottomCards, seed };
}

export function nextSeed(seed: number): number {
  const next = mulberry32(seed)();
  return Math.floor(next * 1_000_000_000);
}
