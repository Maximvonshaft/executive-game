import { getState } from '../core/state.js';
import { showToast } from '../components/toast.js';

const HEARTBEAT_INTERVAL = 15000;

function buildWsUrl() {
  const session = getState('session');
  const base = window.location.origin.replace(/^http/, 'ws');
  const token = session?.token;
  return `${base}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export function createRealtimeManager() {
  let socket = null;
  let heartbeatTimer = null;
  let listeners = new Map();
  let lastSeq = 0;

  function emit(event, payload) {
    const set = listeners.get(event);
    if (set) {
      for (const handler of Array.from(set)) {
        try {
          handler(payload);
        } catch (error) {
          console.error('realtime handler error', error);
        }
      }
    }
  }

  function scheduleHeartbeat() {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'heartbeat', sinceSeq: lastSeq }));
        scheduleHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);
  }

  function connect() {
    const url = buildWsUrl();
    socket = new WebSocket(url);
    socket.addEventListener('open', () => {
      scheduleHeartbeat();
      emit('status', { state: 'connected' });
    });
    socket.addEventListener('close', () => {
      clearTimeout(heartbeatTimer);
      emit('status', { state: 'disconnected' });
      setTimeout(() => connect(), 2000);
    });
    socket.addEventListener('error', () => {
      showToast('实时连接异常，正在重试…', { variant: 'error' });
    });
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.seq === 'number') {
          lastSeq = data.seq;
        }
        emit(data.type, data);
      } catch (error) {
        console.warn('无法解析实时消息', error);
      }
    });
  }

  connect();

  return {
    on(event, handler) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(handler);
      return () => listeners.get(event).delete(handler);
    },
    send(payload) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    },
    getStatus() {
      return socket ? socket.readyState : WebSocket.CLOSED;
    }
  };
}
