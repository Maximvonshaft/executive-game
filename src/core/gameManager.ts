import { analyzeCombination, canBeat } from './combinations';
import { autoArrangeHand } from './handArranger';
import { dealCards, nextSeed } from './deck';
import { Card, GameSettings, GameSnapshotStorage, MatchSnapshot, MultipleEntry, Play, PlayerState, RoundHistoryItem } from './types';

export interface MatchResult {
  winnerRole: 'landlord' | 'farmer';
  rounds: RoundHistoryItem[];
  multiple: number;
  multipleBreakdown: MultipleEntry[];
  landlordId: string;
  durationMs: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  landlordMode: 'grab',
  enableReveal: false,
  enablePersonalDouble: false,
  enableTableDouble: false,
  confirmPlay: true
};

const STORAGE_KEY = 'ddz-snapshot';

class LocalStorageSnapshot implements GameSnapshotStorage {
  private readonly storage: Storage | null;

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }
  }

  clear(): void {
    this.storage?.removeItem(STORAGE_KEY);
  }

  load(): MatchSnapshot | null {
    if (!this.storage) {
      return null;
    }
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as MatchSnapshot;
    } catch (error) {
      console.warn('无法解析存档', error);
      return null;
    }
  }

  write(snapshot: MatchSnapshot): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn('写入存档失败', error);
    }
  }
}

export class GameManager {
  readonly settings: GameSettings;
  private readonly snapshotStorage: GameSnapshotStorage;

  private seed: number;
  private players: PlayerState[] = [];
  private bottomCards: Card[] = [];
  private landlordId: string | null = null;
  private currentPlayerIndex = 0;
  private tablePlay: Play | null = null;
  private passCount = 0;
  private multiple = 1;
  private multipleBreakdown: MultipleEntry[] = [];
  private rounds: RoundHistoryItem[] = [];
  private startedAt = Date.now();
  private lastDealSeed: number;
  private lastPlayPlayerIndex = 0;

  constructor(settings?: Partial<GameSettings>, snapshotStorage: GameSnapshotStorage = new LocalStorageSnapshot()) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.snapshotStorage = snapshotStorage;
    this.seed = Math.floor(Math.random() * 1_000_000_000);
    this.lastDealSeed = this.seed;
    this.startNewMatch();
  }

  getPlayers(): PlayerState[] {
    return this.players.map((player) => ({
      ...player,
      hand: [...player.hand],
      groups: player.groups.map((group) => ({ ...group, cards: [...group.cards] }))
    }));
  }

  getBottomCards(): Card[] {
    return [...this.bottomCards];
  }

  getCurrentPlayer(): PlayerState {
    return this.players[this.currentPlayerIndex];
  }

  getTablePlay(): Play | null {
    return this.tablePlay ? { ...this.tablePlay, cards: [...this.tablePlay.cards] } : null;
  }

  getMultiple(): number {
    return this.multiple;
  }

  getMultipleBreakdown(): MultipleEntry[] {
    return this.multipleBreakdown.map((entry) => ({ ...entry }));
  }

  getRounds(): RoundHistoryItem[] {
    return this.rounds.map((round) => ({ ...round, play: round.play ? { ...round.play, cards: [...round.play.cards] } : null }));
  }

  suggestPlay(playerId: string): Play | null {
    const player = this.players.find((item) => item.id === playerId);
    if (!player) {
      throw new Error('未知玩家');
    }
    const options = this.generateCandidatePlays(player.hand);
    if (options.length === 0) {
      return null;
    }
    const beating = options.filter((option) => canBeat(this.tablePlay, option));
    const choice = beating[0] ?? options[0];
    return { ...choice, cards: [...choice.cards] };
  }

  rearrangeHand(playerId: string): void {
    const player = this.players.find((item) => item.id === playerId);
    if (!player) {
      throw new Error('未知玩家');
    }
    player.groups = autoArrangeHand(player.hand);
    this.persistSnapshot();
  }

  getLandlordId(): string | null {
    return this.landlordId;
  }

  getSeed(): number {
    return this.seed;
  }

  setSeed(seed: number): void {
    this.seed = seed;
  }

  startNewMatch(seed: number = this.seed): void {
    this.lastDealSeed = seed;
    this.seed = seed;
    const deal = dealCards(seed);
    this.bottomCards = deal.bottomCards;
    this.players = deal.players.map((hand, index) => {
      const id = `player-${index}`;
      const role: PlayerState['role'] = index === 0 ? 'farmer' : 'farmer';
      const groups = autoArrangeHand(hand);
      return {
        id,
        name: index === 0 ? '你' : `AI ${index}`,
        role,
        hand,
        groups
      };
    });
    this.landlordId = null;
    this.currentPlayerIndex = 0;
    this.tablePlay = null;
    this.passCount = 0;
    this.multiple = 1;
    this.multipleBreakdown = [{ label: '基础分', value: 1 }];
    this.rounds = [];
    this.startedAt = Date.now();
    this.lastPlayPlayerIndex = this.currentPlayerIndex;
    this.persistSnapshot();
  }

  setLandlord(playerId: string): void {
    this.landlordId = playerId;
    for (const player of this.players) {
      player.role = player.id === playerId ? 'landlord' : 'farmer';
      if (player.id === playerId) {
        player.hand.push(...this.bottomCards);
        player.groups = autoArrangeHand(player.hand);
      }
    }
    this.bottomCards = [];
    this.currentPlayerIndex = this.players.findIndex((player) => player.id === playerId);
    this.persistSnapshot();
  }

  playCards(playerId: string, cardIds: string[]): Play {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('未知玩家');
    }
    if (this.players[this.currentPlayerIndex].id !== playerId) {
      throw new Error('未轮到该玩家');
    }
    const selected = cardIds.map((id) => {
      const card = player.hand.find((item) => item.id === id);
      if (!card) {
        throw new Error('选择了不存在的牌');
      }
      return card;
    });
    const play = analyzeCombination(selected);
    if (!play) {
      throw new Error('牌型不合法');
    }
    if (!canBeat(this.tablePlay, play)) {
      throw new Error('不能压牌');
    }

    for (const card of selected) {
      const index = player.hand.findIndex((item) => item.id === card.id);
      player.hand.splice(index, 1);
    }
    player.groups = autoArrangeHand(player.hand);

    this.tablePlay = play;
    this.rounds.push({ playerId, play, multipleAfter: this.multiple });
    this.passCount = 0;
    this.lastPlayPlayerIndex = this.currentPlayerIndex;

    if (play.type === 'bomb') {
      this.applyMultiple(2, '炸弹');
    } else if (play.type === 'rocket') {
      this.applyMultiple(4, '王炸');
    }

    if (player.hand.length === 0) {
      // Match finished
      const result = this.concludeMatch(player.role);
      this.persistSnapshot();
      throw new MatchFinishedError(result);
    }

    this.advanceTurn();
    this.persistSnapshot();
    return play;
  }

  pass(playerId: string): void {
    if (this.players[this.currentPlayerIndex].id !== playerId) {
      throw new Error('未轮到该玩家');
    }
    this.rounds.push({ playerId, play: null, multipleAfter: this.multiple });
    this.passCount += 1;
    if (this.passCount >= 2) {
      this.tablePlay = null;
      this.passCount = 0;
      this.currentPlayerIndex = this.lastPlayPlayerIndex;
    }
    this.advanceTurn();
    this.persistSnapshot();
  }

  aiDecideAndPlay(): { player: PlayerState; action: 'play' | 'pass'; play: Play | null } {
    const player = this.players[this.currentPlayerIndex];
    if (!player.id.startsWith('player-')) {
      throw new Error('非法玩家标识');
    }
    if (player.id === 'player-0') {
      throw new Error('当前是玩家回合');
    }
    const options = this.generateCandidatePlays(player.hand);
    const beating = options.filter((option) => canBeat(this.tablePlay, option));
    if (this.tablePlay && beating.length === 0) {
      this.pass(player.id);
      return { player, action: 'pass', play: null };
    }
    const play = beating[0] ?? options[0];
    this.playCards(player.id, play.cards.map((card) => card.id));
    return { player, action: 'play', play };
  }

  resetSnapshot(): void {
    this.snapshotStorage.clear();
  }

  loadSnapshot(): boolean {
    const snapshot = this.snapshotStorage.load();
    if (!snapshot) {
      return false;
    }
    this.seed = snapshot.seed;
    this.bottomCards = snapshot.deckRemainder;
    this.landlordId = snapshot.landlordId;
    this.multiple = snapshot.multiple;
    this.multipleBreakdown = snapshot.multipleBreakdown;
    this.tablePlay = snapshot.table ? { ...snapshot.table, cards: [...snapshot.table.cards] } : null;
    this.players = snapshot.players.map((player) => ({
      ...player,
      hand: player.hand,
      groups: player.groups
    }));
    this.currentPlayerIndex = this.players.findIndex((player) => player.id === snapshot.currentPlayerId);
    this.rounds = [];
    this.passCount = 0;
    return true;
  }

  private persistSnapshot(): void {
    const snapshot: MatchSnapshot = {
      seed: this.lastDealSeed,
      players: this.players.map((player) => ({
        ...player,
        hand: [...player.hand],
        groups: player.groups.map((group) => ({ ...group, cards: [...group.cards] }))
      })),
      landlordId: this.landlordId,
      currentPlayerId: this.players[this.currentPlayerIndex].id,
      table: this.tablePlay ? { ...this.tablePlay, cards: [...this.tablePlay.cards] } : null,
      turnIndex: this.currentPlayerIndex,
      multiple: this.multiple,
      multipleBreakdown: this.multipleBreakdown.map((entry) => ({ ...entry })),
      deckRemainder: [...this.bottomCards]
    };
    this.snapshotStorage.write(snapshot);
  }

  private generateCandidatePlays(hand: Card[]): Play[] {
    const plays: Play[] = [];
    for (const card of hand) {
      plays.push({ type: 'single', cards: [card], mainRank: card.rank });
    }
    const attempts: Play[] = [];
    const handCopy = [...hand];
    for (let i = 0; i < handCopy.length; i += 1) {
      for (let j = i + 1; j < handCopy.length; j += 1) {
        const maybe = analyzeCombination([handCopy[i], handCopy[j]]);
        if (maybe) {
          attempts.push(maybe);
        }
      }
    }
    for (const attempt of attempts) {
      plays.push(attempt);
    }
    // Try triples and more by brute force up to 6 cards for performance.
    const maxSelection = Math.min(6, hand.length);
    const indices = Array.from({ length: hand.length }, (_, idx) => idx);
    for (let size = 3; size <= maxSelection; size += 1) {
      const combos = combinations(indices, size);
      for (const combo of combos) {
        const cards = combo.map((index) => hand[index]);
        const play = analyzeCombination(cards);
        if (play) {
          plays.push(play);
        }
      }
    }
    // Remove duplicates by signature
    const unique = new Map<string, Play>();
    for (const play of plays) {
      const signature = `${play.type}-${play.cards
        .map((card) => card.id)
        .sort()
        .join(',')}`;
      if (!unique.has(signature)) {
        unique.set(signature, play);
      }
    }
    return [...unique.values()].sort((a, b) => b.cards.length - a.cards.length);
  }

  private applyMultiple(factor: number, label: string): void {
    this.multiple *= factor;
    this.multipleBreakdown.push({ label, value: factor });
  }

  private advanceTurn(): void {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  private concludeMatch(winnerRole: 'landlord' | 'farmer'): MatchResult {
    const landlord = this.players.find((player) => player.role === 'landlord');
    if (!landlord) {
      throw new Error('未找到地主');
    }
    const result: MatchResult = {
      winnerRole,
      rounds: [...this.rounds],
      multiple: this.multiple,
      multipleBreakdown: [...this.multipleBreakdown],
      landlordId: landlord.id,
      durationMs: Date.now() - this.startedAt
    };
    this.resetSnapshot();
    this.seed = nextSeed(this.seed);
    return result;
  }
}

function combinations(pool: number[], size: number): number[][] {
  const result: number[][] = [];
  const combo: number[] = [];

  function backtrack(start: number): void {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < pool.length; i += 1) {
      combo.push(pool[i]);
      backtrack(i + 1);
      combo.pop();
    }
  }

  backtrack(0);
  return result;
}

export class MatchFinishedError extends Error {
  constructor(public readonly result: MatchResult) {
    super('对局已结束');
  }
}
