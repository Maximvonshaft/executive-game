import type { StateCreator } from 'zustand';
import { getRestClient } from '../apiClient';

export type LeaderboardScope = 'overall' | 'weekly' | 'monthly';

export type LeaderboardEntry = {
  rank: number;
  playerId: string;
  rating: number;
  deviation: number;
  tier: string;
  winRate: number;
  wins: number;
  losses: number;
  lastActiveAt: number | null;
};

export type LeaderboardSlice = {
  leaderboard: {
    scope: LeaderboardScope;
    entries: LeaderboardEntry[];
    generatedAt: number | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    error?: string;
  };
  fetchLeaderboard: (scope?: LeaderboardScope) => Promise<void>;
};

export const createLeaderboardSlice: StateCreator<
  LeaderboardSlice & Record<string, unknown>,
  [['zustand/immer', never]],
  [],
  LeaderboardSlice
> = (set, get) => ({
  leaderboard: {
    scope: 'overall',
    entries: [],
    generatedAt: null,
    status: 'idle'
  },
  async fetchLeaderboard(scope) {
    const targetScope = scope ?? (get() as LeaderboardSlice).leaderboard.scope;
    set((draft) => {
      draft.leaderboard.status = 'loading';
      draft.leaderboard.error = undefined;
      draft.leaderboard.scope = targetScope;
    });
    try {
      const response = await getRestClient().request<{
        leaderboard: {
          scope: LeaderboardScope;
          entries: LeaderboardEntry[];
          generatedAt: number;
        };
      }>(`/leaderboard?scope=${targetScope}`);
      set((draft) => {
        draft.leaderboard.entries = response.leaderboard.entries;
        draft.leaderboard.generatedAt = response.leaderboard.generatedAt;
        draft.leaderboard.scope = response.leaderboard.scope;
        draft.leaderboard.status = 'ready';
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '排行榜加载失败';
      set((draft) => {
        draft.leaderboard.status = 'error';
        draft.leaderboard.error = message;
      });
      throw error;
    }
  }
});
