import type { StateCreator } from 'zustand';
import { getRestClient } from '../apiClient';
import type { RestClient } from '../../lib/api/restClient';

export type AISuggestion = {
  move: string;
  confidence: number;
  explanation?: string;
};

export type AISlice = {
  ai: {
    suggestions: AISuggestion[];
    status: 'idle' | 'loading' | 'error';
    error?: string;
    cooldownEndsAt: number | null;
  };
  requestSuggestion: (options: {
    gameId: string;
    moves: string[];
    nextPlayer?: string;
    limit?: number;
    cooldownMs?: number;
  }) => Promise<AISuggestion[]>;
};

function ensureCooldown(client: RestClient, key: string, cooldownMs: number) {
  if (!client.throttleAiRequest(key, cooldownMs)) {
    throw new Error('AI 请求过于频繁');
  }
}

export const createAISlice: StateCreator<
  AISlice & Record<string, unknown>,
  [['zustand/immer', never]],
  [],
  AISlice
> = (set) => ({
  ai: {
    suggestions: [],
    status: 'idle',
    cooldownEndsAt: null
  },
  async requestSuggestion({ gameId, moves, nextPlayer, limit = 3, cooldownMs = 5000 }) {
    const client = getRestClient();
    ensureCooldown(client, `${gameId}:${moves.join('-')}`, cooldownMs);
    set((draft) => {
      draft.ai.status = 'loading';
      draft.ai.error = undefined;
    });
    try {
      const response = await client.request<{ suggestion: { moves: AISuggestion[]; expiresAt: number } }>(
        '/ai/suggest',
        {
          method: 'POST',
          body: JSON.stringify({ gameId, moves, nextPlayer, limit })
        }
      );
      set((draft) => {
        draft.ai.suggestions = response.suggestion.moves;
        draft.ai.status = 'idle';
        draft.ai.cooldownEndsAt = response.suggestion.expiresAt ?? Date.now() + cooldownMs;
      });
      return response.suggestion.moves;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 建议拉取失败';
      set((draft) => {
        draft.ai.status = 'error';
        draft.ai.error = message;
        draft.ai.cooldownEndsAt = Date.now() + cooldownMs;
      });
      throw error;
    }
  }
});
