import type { StateCreator } from 'zustand';
import { getRestClient } from '../apiClient';

export type Task = {
  id: string;
  title: string;
  description: string;
  type: string;
  progress: number;
  goal: number;
  completed: boolean;
  claimed: boolean;
  reward: { coins?: number } | null;
  updatedAt: number;
  expiresAt: number;
};

export type TaskSlice = {
  tasks: {
    items: Task[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error?: string;
    lastSyncedAt: number | null;
  };
  fetchDailyTasks: () => Promise<Task[]>;
  claimTaskReward: (taskId: string) => Promise<void>;
};

export const createTaskSlice: StateCreator<
  TaskSlice & Record<string, unknown>,
  [['zustand/immer', never]],
  [],
  TaskSlice
> = (set) => ({
  tasks: {
    items: [],
    status: 'idle',
    lastSyncedAt: null
  },
  async fetchDailyTasks() {
    set((draft) => {
      draft.tasks.status = 'loading';
      draft.tasks.error = undefined;
    });
    try {
      const { tasks } = await getRestClient().request<{ tasks: Task[] }>('/tasks/today');
      set((draft) => {
        draft.tasks.items = tasks;
        draft.tasks.status = 'ready';
        draft.tasks.lastSyncedAt = Date.now();
      });
      return tasks;
    } catch (error) {
      const message = error instanceof Error ? error.message : '任务列表加载失败';
      set((draft) => {
        draft.tasks.status = 'error';
        draft.tasks.error = message;
      });
      throw error;
    }
  },
  async claimTaskReward(taskId: string) {
    try {
      await getRestClient().request<{ claim: { taskId: string } }>(`/tasks/${taskId}/claim`, {
        method: 'POST'
      });
      set((draft) => {
        const task = draft.tasks.items.find((item) => item.id === taskId);
        if (task) {
          task.claimed = true;
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '领取奖励失败';
      set((draft) => {
        draft.tasks.error = message;
      });
      throw error;
    }
  }
});
