import type { StateCreator } from 'zustand';
import { getCachedSession, getRestClient, persistSession, resetSession } from '../apiClient';
import type { StoredUser } from '../../utils/storage';

export type SessionStatus = 'idle' | 'initializing' | 'authenticated' | 'anonymous' | 'error';

export type SessionSlice = {
  session: {
    status: SessionStatus;
    token: string | null;
    user: StoredUser | null;
    error?: string;
  };
  initializeSession: () => Promise<void>;
  authenticateWithTelegram: (initData: string) => Promise<void>;
  clearSession: () => void;
};

export const createSessionSlice: StateCreator<
  SessionSlice & Record<string, unknown>,
  [['zustand/immer', never]],
  [],
  SessionSlice
> = (set, get) => ({
  session: {
    status: 'idle',
    token: null,
    user: null
  },
  async initializeSession() {
    set((state) => {
      state.session.status = 'initializing';
      state.session.error = undefined;
    });
    const cached = getCachedSession();
    if (!cached.token) {
      set((state) => {
        state.session.status = 'anonymous';
        state.session.token = null;
        state.session.user = null;
      });
      return;
    }
    set((state) => {
      state.session.token = cached.token;
      state.session.user = cached.user ?? null;
    });
    const client = getRestClient();
    try {
      if (cached.user?.id) {
        const profileResponse = await client.request<{ profile: unknown }>(`/profile/${cached.user.id}`);
        set((state: any) => {
          state.player = state.player || {};
          state.player.profile = profileResponse.profile;
          state.player.status = 'ready';
        });
        const store = get() as any;
        store.refreshSocialGraph?.(cached.user.id);
      }
      set((state) => {
        state.session.status = 'authenticated';
        state.session.error = undefined;
      });
    } catch (error) {
      resetSession();
      const message = error instanceof Error ? error.message : '登录状态已失效';
      set((state) => {
        state.session.status = 'anonymous';
        state.session.token = null;
        state.session.user = null;
        state.session.error = message;
      });
    }
  },
  async authenticateWithTelegram(initData: string) {
    const client = getRestClient();
    set((state) => {
      state.session.status = 'initializing';
      state.session.error = undefined;
    });
    try {
      const session = await client.request<{ token: string; user: StoredUser }>(
        '/auth/telegram',
        {
          method: 'POST',
          body: JSON.stringify({ initData })
        }
      );
      persistSession(session);
      if (session.user?.id) {
        const profile = await client.request<{ profile: unknown }>(`/profile/${session.user.id}`);
        set((state: any) => {
          state.player = state.player || {};
          state.player.profile = profile.profile;
          state.player.status = 'ready';
        });
        const store = get() as any;
        store.refreshSocialGraph?.(session.user.id);
      }
      set((state) => {
        state.session.status = 'authenticated';
        state.session.token = session.token;
        state.session.user = session.user ?? null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败';
      set((state) => {
        state.session.status = 'error';
        state.session.error = message;
      });
      throw error;
    }
  },
  clearSession() {
    resetSession();
    set((state) => {
      state.session.status = 'anonymous';
      state.session.token = null;
      state.session.user = null;
    });
  }
});
