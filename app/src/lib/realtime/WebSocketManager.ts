import mitt from 'mitt';

export type ConnectionRole = 'player' | 'spectator';

export type WebSocketManagerOptions = {
  url: string;
  heartbeatIntervalMs?: number;
  reconnectDelaysMs?: number[];
  onUnauthorized?: () => void;
};

export type WebSocketEventMap = {
  open: WebSocket;
  close: CloseEvent;
  message: MessageEvent;
  error: Event;
  reconnecting: { attempt: number; delay: number };
};

type SinceSeqRequest = {
  type: 'sinceSeq';
  seq: number;
};

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private readonly options: Required<Omit<WebSocketManagerOptions, 'heartbeatIntervalMs' | 'reconnectDelaysMs'>> & {
    heartbeatIntervalMs: number;
    reconnectDelaysMs: number[];
  };
  private readonly emitter = mitt<WebSocketEventMap>();
  private heartbeat?: number;
  private reconnectTimer?: number;
  private sinceSeq = 0;
  private role: ConnectionRole = 'player';
  private token: string | null = null;
  private readonly pendingMessages: SinceSeqRequest[] = [];

  constructor(options: WebSocketManagerOptions) {
    this.options = {
      heartbeatIntervalMs: 20_000,
      reconnectDelaysMs: [1000, 2000, 3000, 5000],
      onUnauthorized: () => {},
      ...options
    } as WebSocketManager['options'];
  }

  connect(token: string, role: ConnectionRole = 'player') {
    this.role = role;
    this.token = token;
    this.cleanup();
    const url = new URL(this.options.url);
    url.searchParams.set('role', role);
    url.searchParams.set('token', token);
    this.socket = new WebSocket(url.toString());
    this.socket.addEventListener('open', this.handleOpen);
    this.socket.addEventListener('close', this.handleClose);
    this.socket.addEventListener('message', this.handleMessage);
    this.socket.addEventListener('error', this.handleError);
  }

  disconnect() {
    this.cleanup();
    this.socket?.close();
    this.socket = null;
  }

  send(payload: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket 尚未连接');
    }
    this.socket.send(JSON.stringify(payload));
  }

  requestSince(seq: number) {
    if (!Number.isFinite(seq) || seq < 0) {
      throw new Error('sinceSeq 必须为正数');
    }
    const payload: SinceSeqRequest = { type: 'sinceSeq', seq };
    this.pendingMessages.push(payload);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  setRole(role: ConnectionRole) {
    if (this.role === role) {
      return;
    }
    this.role = role;
    this.reconnect(true);
  }

  on<Event extends keyof WebSocketEventMap>(event: Event, handler: (payload: WebSocketEventMap[Event]) => void) {
    this.emitter.on(event, handler);
    return () => this.emitter.off(event, handler);
  }

  private readonly handleOpen = (event: Event) => {
    if (!(event.target instanceof WebSocket)) {
      return;
    }
    this.emitter.emit('open', event.target);
    this.startHeartbeat();
    this.flushPending();
    this.replaySinceSeq();
  };

  private readonly handleClose = (event: CloseEvent) => {
    this.stopHeartbeat();
    this.emitter.emit('close', event);
    if (event.code === 4001) {
      this.options.onUnauthorized();
      return;
    }
    this.reconnect();
  };

  private readonly handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data?.seq) {
        this.sinceSeq = data.seq;
      }
      if (data?.type === 'replay' && typeof data.lastSeq === 'number') {
        this.sinceSeq = data.lastSeq;
      }
      this.emitter.emit('message', event);
    } catch (error) {
      console.warn('无法解析 WebSocket 数据', error);
    }
  };

  private readonly handleError = (event: Event) => {
    this.emitter.emit('error', event);
  };

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeat = window.setInterval(() => {
      try {
        this.send({ type: 'ping', ts: Date.now() });
      } catch (error) {
        console.warn('心跳发送失败', error);
      }
    }, this.options.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeat) {
      window.clearInterval(this.heartbeat);
      this.heartbeat = undefined;
    }
  }

  private cleanup() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.removeEventListener('open', this.handleOpen);
      this.socket.removeEventListener('close', this.handleClose);
      this.socket.removeEventListener('message', this.handleMessage);
      this.socket.removeEventListener('error', this.handleError);
    }
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private reconnect(forceImmediate = false) {
    this.cleanup();
    const delays = this.options.reconnectDelaysMs;
    let attempt = 0;
    if (!this.token) {
      return;
    }
    const schedule = () => {
      const delay = forceImmediate
        ? 0
        : attempt >= delays.length
          ? delays.at(-1)!
          : delays[attempt];
      this.emitter.emit('reconnecting', { attempt, delay });
      this.reconnectTimer = window.setTimeout(() => {
        attempt += 1;
        if (this.token) {
          this.connect(this.token, this.role);
        }
      }, delay);
    };
    schedule();
  }

  private flushPending() {
    if (!this.socket) {
      return;
    }
    while (this.pendingMessages.length > 0) {
      const payload = this.pendingMessages.shift();
      if (payload) {
        this.socket.send(JSON.stringify(payload));
      }
    }
  }

  private replaySinceSeq() {
    if (this.sinceSeq > 0) {
      this.requestSince(this.sinceSeq);
    }
  }
}
