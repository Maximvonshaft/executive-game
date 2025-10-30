import { describe, expect, it } from 'vitest';
import { GameManager } from '../gameManager';
import { GameSnapshotStorage, MatchSnapshot } from '../types';

class MemoryStorage implements GameSnapshotStorage {
  snapshot: MatchSnapshot | null = null;

  clear(): void {
    this.snapshot = null;
  }

  load(): MatchSnapshot | null {
    return this.snapshot;
  }

  write(snapshot: MatchSnapshot): void {
    this.snapshot = snapshot;
  }
}

describe('GameManager', () => {
  it('可以开局、抢地主并出牌', () => {
    const storage = new MemoryStorage();
    const manager = new GameManager({}, storage);
    manager.startNewMatch(123);
    const players = manager.getPlayers();
    expect(players).toHaveLength(3);
    expect(manager.getBottomCards()).toHaveLength(3);

    manager.setLandlord(players[0].id);
    const suggestion = manager.suggestPlay(players[0].id);
    expect(suggestion).not.toBeNull();
    const hand = manager.getPlayers().find((p) => p.id === players[0].id)?.hand ?? [];
    const cardId = hand[0]?.id;
    expect(cardId).toBeDefined();
    if (cardId) {
      manager.playCards(players[0].id, [cardId]);
      expect(manager.getCurrentPlayer().id).not.toBe(players[0].id);
      manager.pass(manager.getCurrentPlayer().id);
      expect(storage.snapshot).not.toBeNull();
    }
  });
});
