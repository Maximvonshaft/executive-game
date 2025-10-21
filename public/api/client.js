import { resolveErrorMessage } from './errorDictionary.js';
import { getState, setState } from '../core/state.js';
import { showToast } from '../components/toast.js';

const STORAGE_KEY = 'executive-arena.session';

function loadStoredSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('failed to load session', error);
    return null;
  }
}

function persistSession(session) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('failed to persist session', error);
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('failed to clear session', error);
  }
}

function getBaseUrl() {
  const { origin } = window.location;
  return origin.replace(/\/app$/, '');
}

async function request(path, options = {}) {
  const session = getState('session');
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (session && session.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? (options.body instanceof FormData ? options.body : JSON.stringify(options.body)) : undefined,
    mode: 'cors'
  });
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      // ignore
    }
    const message = payload && payload.error ? resolveErrorMessage(payload.error.code, payload.error.message) : response.statusText;
    const error = new Error(message);
    error.code = payload && payload.error ? payload.error.code : 'SERVER_ERROR';
    throw error;
  }
  const data = await response.json();
  return data.data;
}

export function createApiClient() {
  const stored = loadStoredSession();
  if (stored) {
    setState('session', stored);
  }
  return {
    async loginWithTelegram(initData) {
      try {
        const payload = await request('/api/auth/telegram', {
          method: 'POST',
          body: { initData }
        });
        const session = {
          token: payload.token,
          expiresAt: Date.now() + payload.expiresIn * 1000,
          profile: payload.profile
        };
        setState('session', session);
        persistSession(session);
        return session;
      } catch (error) {
        showToast(resolveErrorMessage(error.code, error.message), { variant: 'error' });
        throw error;
      }
    },
    async logout() {
      clearSession();
      setState('session', null);
    },
    async refreshProfile() {
      const profile = await request('/api/profile/me');
      const session = getState('session');
      if (session) {
        const merged = { ...session, profile };
        setState('session', merged);
        persistSession(merged);
      }
      return profile;
    },
    getGames() {
      return request('/api/games');
    },
    getGameMeta(gameId) {
      return request(`/api/games/${encodeURIComponent(gameId)}/meta`);
    },
    startMatch(gameId) {
      return request('/api/match/start', {
        method: 'POST',
        body: { gameId }
      });
    },
    cancelMatch(ticketId) {
      return request('/api/match/cancel', {
        method: 'POST',
        body: { ticketId }
      });
    },
    getActiveRoom() {
      return request('/api/rooms');
    },
    joinRoom(roomId) {
      return request('/api/rooms/join', {
        method: 'POST',
        body: { roomId }
      });
    },
    createPrivateRoom(payload) {
      return request('/api/rooms', {
        method: 'POST',
        body: payload
      });
    },
    getLeaderboard(range) {
      const params = new URLSearchParams();
      if (range) params.set('range', range);
      const query = params.toString() ? `?${params}` : '';
      return request(`/api/leaderboard${query}`);
    },
    getTasks() {
      return request('/api/tasks/today');
    },
    claimTask(taskId) {
      return request(`/api/tasks/${encodeURIComponent(taskId)}/claim`, { method: 'POST' });
    },
    getProfile(playerId) {
      return request(`/api/profile/${encodeURIComponent(playerId)}`);
    },
    getFriends() {
      return request('/api/friends');
    },
    addFriend(playerId) {
      return request('/api/friends', {
        method: 'POST',
        body: { playerId }
      });
    },
    removeFriend(playerId) {
      return request(`/api/friends/${encodeURIComponent(playerId)}`, {
        method: 'DELETE'
      });
    },
    unblockPlayer(playerId) {
      return request(`/api/friends/${encodeURIComponent(playerId)}/unblock`, {
        method: 'POST'
      });
    },
    getPracticeScenarios() {
      return request('/api/practice/scenarios');
    },
    requestAiSuggestion(roomId) {
      return request('/api/ai/suggest', {
        method: 'POST',
        body: { roomId }
      });
    },
    getReplay(matchId) {
      return request(`/internal/replay/${encodeURIComponent(matchId)}`);
    },
    getObservabilityMetrics() {
      return request('/api/observability');
    },
    getAnnouncements() {
      return request('/api/announcement');
    },
    getBanners() {
      return request('/api/banners');
    },
    getAccessibilitySettings() {
      return request('/api/accessibility');
    },
    loadI18n(locale) {
      return request(`/api/i18n?locale=${encodeURIComponent(locale)}`);
    },
    adminListTasks() {
      return request('/admin/tasks');
    },
    adminUpdateTask(taskId, payload) {
      return request(`/admin/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PUT',
        body: payload
      });
    }
  };
}
