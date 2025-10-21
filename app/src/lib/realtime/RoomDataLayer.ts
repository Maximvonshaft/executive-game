import mitt from 'mitt';
import type { RestClient } from '../api/restClient';
import { WebSocketManager, type ConnectionRole } from './WebSocketManager';

type RoomSnapshot = {
  id: string;
  gameId: string;
  sequence: number;
  players: Array<{ id: string; seat: number; ready: boolean; attributes?: Record<string, unknown> }>;
  spectators?: Array<{ id: string }>;
  status: string;
  events?: unknown[];
  [key: string]: unknown;
};

type RoomEvent = {
  sequence: number;
  type: string;
  payload: unknown;
  receivedAt: number;
};

type LayerEvents = {
  state: RoomSnapshot;
  event: RoomEvent;
  connection: { status: 'connecting' | 'open' | 'closed' | 'reconnecting'; attempt?: number; delay?: number };
};

export class RoomDataLayer {
  private readonly emitter = mitt<LayerEvents>();
  private currentRoom: RoomSnapshot | null = null;
  private readonly events: RoomEvent[] = [];

  constructor(private readonly rest: RestClient, private readonly realtime: WebSocketManager) {
    this.realtime.on('open', () => {
      this.emitter.emit('connection', { status: 'open' });
    });
    this.realtime.on('close', () => {
      this.emitter.emit('connection', { status: 'closed' });
    });
    this.realtime.on('reconnecting', ({ attempt, delay }) => {
      this.emitter.emit('connection', { status: 'reconnecting', attempt, delay });
    });
    this.realtime.on('message', (event) => {
      this.handleMessage(event.data as string);
    });
  }

  connect(token: string, role: ConnectionRole = 'player') {
    this.emitter.emit('connection', { status: 'connecting' });
    this.realtime.connect(token, role);
  }

  disconnect() {
    this.realtime.disconnect();
    this.currentRoom = null;
    this.events.length = 0;
  }

  on<Event extends keyof LayerEvents>(event: Event, handler: (payload: LayerEvents[Event]) => void) {
    this.emitter.on(event, handler);
    return () => this.emitter.off(event, handler);
  }

  async loadRooms() {
    return this.rest.request<{ rooms: RoomSnapshot[] }>('/rooms');
  }

  async joinRoom(options: { roomId?: string; inviteCode?: string; asSpectator?: boolean }) {
    const response = await this.rest.request<{ room: RoomSnapshot; role: ConnectionRole }>(
      '/rooms/join',
      {
        method: 'POST',
        body: JSON.stringify(options)
      }
    );
    this.currentRoom = response.room;
    this.emitter.emit('state', response.room);
    return response;
  }

  async requestAction(action: string, payload: Record<string, unknown>) {
    if (!this.currentRoom) {
      throw new Error('尚未进入房间');
    }
    await this.rest.request(`/rooms`, {
      method: 'POST',
      body: JSON.stringify({ action, roomId: this.currentRoom.id, ...payload })
    });
  }

  getEventLog(limit = 100) {
    return this.events.slice(-limit);
  }

  private handleMessage(raw: string) {
    try {
      const message = JSON.parse(raw);
      if (message.type === 'room_state') {
        this.currentRoom = message.state as RoomSnapshot;
        this.events.length = 0;
        this.emitter.emit('state', this.currentRoom);
        return;
      }
      const roomEvent: RoomEvent = {
        sequence: message.sequence ?? 0,
        type: message.type,
        payload: message.payload,
        receivedAt: Date.now()
      };
      this.events.push(roomEvent);
      if (this.currentRoom) {
        this.currentRoom.sequence = roomEvent.sequence;
      }
      this.emitter.emit('event', roomEvent);
    } catch (error) {
      console.warn('无法解析房间消息', error);
    }
  }
}
