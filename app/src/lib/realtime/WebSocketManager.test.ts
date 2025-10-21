import { describe, expect, it, beforeEach, vi } from 'vitest';
import { WebSocketManager } from './WebSocketManager';

type Listener = (event: Event) => void;

const CloseEventCtor =
  typeof CloseEvent === 'undefined'
    ? class extends Event {
        code: number;
        constructor(type: string, init?: { code?: number }) {
          super(type);
          this.code = init?.code ?? 1000;
        }
      }
    : CloseEvent;

const MessageEventCtor =
  typeof MessageEvent === 'undefined'
    ? class extends Event {
        data: unknown;
        constructor(type: string, init?: { data?: unknown }) {
          super(type);
          this.data = init?.data;
        }
      }
    : MessageEvent;

class MockWebSocket extends EventTarget {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;

  public readyState = MockWebSocket.CONNECTING;
  public url: string;
  public sent: string[] = [];

  constructor(url: string) {
    super();
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.dispatchEvent(new CloseEventCtor('close', { code: 1000 }) as unknown as CloseEvent);
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  receive(data: unknown) {
    this.dispatchEvent(new MessageEventCtor('message', { data: JSON.stringify(data) }) as unknown as MessageEvent);
  }
}

declare global {
  interface Window {
    WebSocket: typeof MockWebSocket;
  }
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

describe('WebSocketManager', () => {
  beforeEach(() => {
    MockWebSocket.instances.length = 0;
  });

  it('在连接时附加 token 与角色', () => {
    const manager = new WebSocketManager({ url: 'ws://localhost/ws' });
    manager.connect('token-1', 'spectator');
    expect(MockWebSocket.instances).toHaveLength(1);
    const instance = MockWebSocket.instances[0];
    expect(instance.url).toContain('token=token-1');
    expect(instance.url).toContain('role=spectator');
  });

  it('处理 room_state 与事件序列', () => {
    const manager = new WebSocketManager({ url: 'ws://localhost/ws' });
    const events: unknown[] = [];
    manager.on('message', (event) => {
      events.push(event);
    });
    manager.connect('token-2', 'player');
    const instance = MockWebSocket.instances[0];
    instance.open();
    instance.receive({ type: 'room_state', state: { id: 'room-1', sequence: 10 } });
    instance.receive({ type: 'move_played', sequence: 11, payload: { move: 'A1' } });
    expect(events).toHaveLength(1);
    expect(events[0].data).toContain('move_played');
    const pingPayload = instance.sent.find((payload) => payload.includes('"type":"ping"'));
    expect(pingPayload).toBeDefined();
  });

  it('关闭时触发重连', () => {
    vi.useFakeTimers();
    const manager = new WebSocketManager({ url: 'ws://localhost/ws', reconnectDelaysMs: [100] });
    const handler = vi.fn();
    manager.on('reconnecting', handler);
    manager.connect('token-3', 'player');
    const instance = MockWebSocket.instances[0];
    instance.dispatchEvent(new CloseEventCtor('close', { code: 1002 }) as unknown as CloseEvent);
    vi.runOnlyPendingTimers();
    expect(handler).toHaveBeenCalled();
    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
  });
});
