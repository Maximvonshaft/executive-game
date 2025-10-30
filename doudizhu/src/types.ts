export type PlayerId = 'P0' | 'P1' | 'P2';

export type Suit = 'S' | 'H' | 'C' | 'D' | 'J';

export type Rank =
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'
  | '2'
  | 'SJ'
  | 'BJ';

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

export type ComboType =
  | 'SINGLE'
  | 'PAIR'
  | 'TRIPLE'
  | 'TRIPLE_WITH_1'
  | 'TRIPLE_WITH_2'
  | 'STRAIGHT'
  | 'PAIR_SEQUENCE'
  | 'TRIPLE_SEQUENCE'
  | 'TRIPLE_SEQ_W_SINGLES'
  | 'TRIPLE_SEQ_W_PAIRS'
  | 'FOUR_WITH_2'
  | 'FOUR_WITH_PAIRS'
  | 'BOMB'
  | 'ROCKET';

export type Combo = {
  type: ComboType;
  cards: Card[];
  mainRank: Rank;
  length?: number;
  meta?: { size?: number; wing?: 'NONE' | 'SINGLES' | 'PAIRS' };
};

export type Phase = 'IDLE' | 'DEAL' | 'BIDDING' | 'PLAYING' | 'ENDED';

export type TrickState = {
  leader: PlayerId;
  currentPlayer: PlayerId;
  combo: Combo | null;
  lastComboOwner: PlayerId | null;
  passSet: PlayerId[];
};

export type GameConfig = {
  seed?: number;
};

export type PlayerBid = {
  pid: PlayerId;
  score: 0 | 1 | 2 | 3;
};

export type GameState = {
  version: number;
  phase: Phase;
  deck: Card[];
  hands: Record<PlayerId, Card[]>;
  landlord?: PlayerId;
  bids: PlayerBid[];
  bidTurn?: PlayerId;
  bidBase: 1 | 2 | 3;
  multiple: number;
  trick: TrickState | null;
  history: GameStateSnapshot[];
  upcomingBottom: Card[];
  log: string[];
  winner?: 'LANDLORD' | 'FARMERS';
};

export type GameStateSnapshot = {
  phase: Phase;
  hands: Record<PlayerId, Card[]>;
  landlord?: PlayerId;
  bidBase: 1 | 2 | 3;
  multiple: number;
  trick: TrickState | null;
  bids: PlayerBid[];
  currentPlayer?: PlayerId;
  deck: Card[];
  upcomingBottom: Card[];
  log: string[];
};

export type Observation = {
  me: PlayerId;
  myHand: Card[];
  public: {
    trickCombo?: Combo | null;
    lastComboOwner?: PlayerId | null;
    passSet: PlayerId[];
    remainMap: Record<PlayerId, number>;
    landlordId?: PlayerId;
    multiple: number;
  };
  required: { type?: ComboType | null; mustBeat: boolean };
};

export type AiDecision = { action: 'PASS' } | { action: 'PLAY'; cards: Card[] };
