export type Suit = 'spade' | 'heart' | 'club' | 'diamond' | 'joker';

export const SUITS: Suit[] = ['spade', 'heart', 'club', 'diamond'];

export type StandardRank =
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

export type JokerRank = 16 | 17;

export type CardRank = StandardRank | JokerRank;

export interface Card {
  id: string;
  suit: Suit;
  rank: CardRank;
}

export const RANK_ORDER: CardRank[] = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
];

export const RANK_LABEL: Record<CardRank, string> = {
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
  15: '2',
  16: 'SJ',
  17: 'BJ'
};

export const SUIT_SYMBOL: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦',
  joker: '★'
};

export type CombinationType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'tripleWithSingle'
  | 'tripleWithPair'
  | 'straight'
  | 'pairSequence'
  | 'plane'
  | 'planeWithSingles'
  | 'planeWithPairs'
  | 'fourWithTwoSingles'
  | 'fourWithTwoPairs'
  | 'bomb'
  | 'rocket';

export interface Play {
  type: CombinationType;
  cards: Card[];
  mainRank: CardRank;
  kickerRanks?: CardRank[];
}

export interface PlayerState {
  id: string;
  name: string;
  role: 'landlord' | 'farmer';
  hand: Card[];
  groups: GroupedHand;
  declared?: {
    revealed: boolean;
  };
}

export type GroupedHand = HandGroup[];

export interface HandGroup {
  label: string;
  cards: Card[];
  type: CombinationType | 'unsorted';
}

export interface MatchSnapshot {
  seed: number;
  players: PlayerState[];
  landlordId: string | null;
  currentPlayerId: string;
  table: Play | null;
  turnIndex: number;
  multiple: number;
  multipleBreakdown: MultipleEntry[];
  deckRemainder: Card[];
}

export interface MultipleEntry {
  label: string;
  value: number;
}

export interface RoundHistoryItem {
  playerId: string;
  play: Play | null;
  multipleAfter: number;
}

export interface GameSettings {
  landlordMode: 'bid' | 'grab';
  enableReveal: boolean;
  enablePersonalDouble: boolean;
  enableTableDouble: boolean;
  confirmPlay: boolean;
}

export interface PersistentStatsEntry {
  id: string;
  role: 'landlord' | 'farmer';
  multiple: number;
  result: 'win' | 'lose';
  durationMs: number;
  createdAt: number;
}

export interface GameSnapshotStorage {
  write(snapshot: MatchSnapshot): void;
  load(): MatchSnapshot | null;
  clear(): void;
}
