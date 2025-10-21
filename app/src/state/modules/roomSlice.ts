import type { StateCreator } from 'zustand';
import { getRestClient } from '../apiClient';
import { RoomDataLayer } from '../../lib/realtime/RoomDataLayer';
import type { ConnectionRole } from '../../lib/realtime/WebSocketManager';

export type RoomSlice = {
  rooms: {
    playing: any[];
    spectating: any[];
    activeRoom: any | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    connection: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
    eventLog: Array<{ sequence: number; type: string; payload: unknown; receivedAt: number }>;
    lastError?: string;
    role: ConnectionRole;
  };
  roomLayer: RoomDataLayer | null;
  initializeRoomLayer: (layer: RoomDataLayer) => void;
  connectRealtime: (token: string, role?: ConnectionRole) => void;
  disconnectRealtime: () => void;
  loadRooms: () => Promise<void>;
  joinRoom: (options: { roomId?: string; inviteCode?: string; asSpectator?: boolean }) => Promise<void>;
  updateActiveRoom: (room: unknown) => void;
};

export const createRoomSlice: StateCreator<
  RoomSlice & Record<string, unknown>,
  [['zustand/immer', never]],
  [],
  RoomSlice
> = (set, get) => ({
  rooms: {
    playing: [],
    spectating: [],
    activeRoom: null,
    status: 'idle',
    connection: 'disconnected',
    eventLog: [],
    role: 'player'
  },
  roomLayer: null,
  initializeRoomLayer(layer) {
    layer.on('state', (room) => {
      set((draft) => {
        draft.rooms.activeRoom = room;
        draft.rooms.eventLog = [];
      });
    });
    layer.on('event', (event) => {
      set((draft) => {
        draft.rooms.eventLog = [...draft.rooms.eventLog.slice(-49), event];
      });
    });
    layer.on('connection', (status) => {
      set((draft) => {
        if (status.status === 'connecting') {
          draft.rooms.connection = 'connecting';
        } else if (status.status === 'open') {
          draft.rooms.connection = 'connected';
        } else if (status.status === 'reconnecting') {
          draft.rooms.connection = 'reconnecting';
        } else {
          draft.rooms.connection = 'disconnected';
        }
      });
    });
    set((draft) => {
      draft.roomLayer = layer;
      draft.rooms.status = 'idle';
    });
  },
  connectRealtime(token, role = 'player') {
    const layer = get().roomLayer;
    if (!layer) {
      throw new Error('房间层尚未初始化');
    }
    set((draft) => {
      draft.rooms.role = role;
      draft.rooms.connection = 'connecting';
    });
    layer.connect(token, role);
  },
  disconnectRealtime() {
    const layer = get().roomLayer;
    if (layer) {
      layer.disconnect();
    }
    set((draft) => {
      draft.rooms.connection = 'disconnected';
      draft.rooms.activeRoom = null;
      draft.rooms.eventLog = [];
    });
  },
  async loadRooms() {
    set((draft) => {
      draft.rooms.status = 'loading';
      draft.rooms.lastError = undefined;
    });
    try {
      const response = await getRestClient().request<{ rooms: any[]; spectating: any[] }>('/rooms');
      set((draft) => {
        draft.rooms.playing = response.rooms;
        draft.rooms.spectating = response.spectating ?? [];
        draft.rooms.status = 'ready';
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '房间列表加载失败';
      set((draft) => {
        draft.rooms.status = 'error';
        draft.rooms.lastError = message;
      });
      throw error;
    }
  },
  async joinRoom(options) {
    const layer = get().roomLayer;
    if (!layer) {
      throw new Error('房间层尚未初始化');
    }
    try {
      const response = await layer.joinRoom(options);
      set((draft) => {
        draft.rooms.activeRoom = response.room;
        draft.rooms.role = response.role;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '加入房间失败';
      set((draft) => {
        draft.rooms.lastError = message;
      });
      throw error;
    }
  },
  updateActiveRoom(room) {
    set((draft) => {
      draft.rooms.activeRoom = room;
    });
  }
});
