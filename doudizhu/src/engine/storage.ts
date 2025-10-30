import type { GameState } from '../types';

const STORAGE_KEY = 'doudizhu-save-v1';

export function save(gs: GameState): void {
  if (typeof localStorage === 'undefined') return;
  const payload = JSON.stringify(gs);
  localStorage.setItem(STORAGE_KEY, payload);
}

export function load(): GameState | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch (err) {
    console.warn('保存数据损坏，将删除');
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
