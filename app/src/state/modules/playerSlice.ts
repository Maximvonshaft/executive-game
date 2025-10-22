import type { StateCreator } from 'zustand';
import { getRestClient } from '../apiClient';
import type { StoredUser } from '../../utils/storage';

export type PlayerProfile = {
  id: string;
  rating: number;
  ratingDeviation: number;
  tier: string;
  identity?: {
    avatarUrl: string;
    frameUrl?: string;
    bannerUrl?: string;
    title?: string;
  };
  preferences?: {
    primaryHand?: 'left' | 'right' | 'ambidextrous';
    orientationLock?: 'auto' | 'landscape' | 'portrait';
    effectIntensity?: 'low' | 'medium' | 'high';
    enableHaptics?: boolean;
    language?: string;
    colorblindMode?: 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia';
    textSize?: 'default' | 'large' | 'extra-large';
  };
  stats: {
    totalMatches: number;
    wins: number;
    losses: number;
    draws: number;
    winStreak: number;
    bestWinStreak: number;
  };
  history: Array<{
    matchId: string;
    gameId: string;
    result: string;
    ratingDelta: number;
    playedAt: number;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    earnedAt: number;
  }>;
  currencies: {
    coins: number;
  };
};

export type SocialOverview = {
  friends: Array<{ playerId: string }>;
  blocked: Array<{ playerId: string }>;
  recentOpponents: Array<{
    playerId: string;
    gameId: string;
    roomId: string;
    lastPlayedAt: number;
  }>;
};

export type PlayerSlice = {
  player: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    profile: PlayerProfile | null;
    social: SocialOverview | null;
    error?: string;
  };
  fetchProfile: (playerId?: string) => Promise<PlayerProfile | null>;
  refreshSocialGraph: (playerId?: string) => Promise<SocialOverview | null>;
  hydrateFromSession: (user: StoredUser | null) => Promise<void>;
};

export const createPlayerSlice: StateCreator<
  PlayerSlice & Record<string, unknown>,
  [['zustand/immer', never]],
  [],
  PlayerSlice
> = (set, get) => ({
  player: {
    status: 'idle',
    profile: null,
    social: null
  },
  async fetchProfile(playerId) {
    const state = get() as any;
    const targetId: string | undefined = playerId ?? state.session?.user?.id;
    if (!targetId) {
      return null;
    }
    set((draft) => {
      draft.player.status = 'loading';
      draft.player.error = undefined;
    });
    try {
      const { profile } = await getRestClient().request<{ profile: PlayerProfile }>(
        `/profile/${targetId}`
      );
      set((draft) => {
        draft.player.profile = profile;
        draft.player.status = 'ready';
      });
      return profile;
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取玩家资料失败';
      set((draft) => {
        draft.player.status = 'error';
        draft.player.error = message;
      });
      throw error;
    }
  },
  async refreshSocialGraph(playerId) {
    const state = get() as any;
    const targetId: string | undefined = playerId ?? state.session?.user?.id;
    if (!targetId) {
      return null;
    }
    try {
      const overview = await getRestClient().request<SocialOverview>('/friends');
      set((draft) => {
        draft.player.social = overview;
        if (draft.player.status === 'idle') {
          draft.player.status = 'ready';
        }
      });
      return overview;
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取社交数据失败';
      set((draft) => {
        draft.player.error = message;
      });
      throw error;
    }
  },
  async hydrateFromSession(user: StoredUser | null) {
    if (!user) {
      set((draft) => {
        draft.player.profile = null;
        draft.player.social = null;
        draft.player.status = 'idle';
      });
      return;
    }
    const store = get() as PlayerSlice & Record<string, unknown>;
    await Promise.allSettled([
      store.fetchProfile(user.id),
      store.refreshSocialGraph(user.id)
    ]);
  }
});
