import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createSessionSlice, type SessionSlice } from './modules/sessionSlice';
import { createPlayerSlice, type PlayerSlice } from './modules/playerSlice';
import { createTaskSlice, type TaskSlice } from './modules/taskSlice';
import { createLeaderboardSlice, type LeaderboardSlice } from './modules/leaderboardSlice';
import { createAnnouncementSlice, type AnnouncementSlice } from './modules/announcementSlice';
import { createAISlice, type AISlice } from './modules/aiSlice';
import { createRoomSlice, type RoomSlice } from './modules/roomSlice';
import { createUISlice, type UISlice } from './modules/uiSlice';
import { WebSocketManager } from '../lib/realtime/WebSocketManager';
import { RoomDataLayer } from '../lib/realtime/RoomDataLayer';
import { getRestClient } from './apiClient';

export type GlobalState = SessionSlice &
  PlayerSlice &
  TaskSlice &
  LeaderboardSlice &
  AnnouncementSlice &
  AISlice &
  RoomSlice &
  UISlice;

function resolveRealtimeUrl() {
  if (typeof window === 'undefined') {
    return 'ws://localhost:3000/ws';
  }
  const { protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}/ws`;
}

const realtimeManager = new WebSocketManager({ url: resolveRealtimeUrl() });
const roomDataLayer = new RoomDataLayer(getRestClient(), realtimeManager);

export const useGlobalStore = create<GlobalState>()(
  immer((set, get) => ({
    ...createSessionSlice(set, get),
    ...createPlayerSlice(set, get),
    ...createTaskSlice(set, get),
    ...createLeaderboardSlice(set, get),
    ...createAnnouncementSlice(set, get),
    ...createAISlice(set, get),
    ...createRoomSlice(set, get),
    ...createUISlice(set, get)
  }))
);

useGlobalStore.getState().initializeRoomLayer(roomDataLayer);

export function getRoomLayer() {
  return roomDataLayer;
}
