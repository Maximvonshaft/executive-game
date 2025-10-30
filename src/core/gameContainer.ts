import { GameManager } from './gameManager';

let instance: GameManager | null = null;

export function getGameManager(): GameManager {
  if (!instance) {
    instance = new GameManager();
  }
  return instance;
}

export function resetGameManager(): void {
  instance = new GameManager();
}
