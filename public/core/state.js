const listeners = new Map();
const state = {
  session: null,
  i18n: {
    locale: 'en',
    messages: {}
  },
  telemetry: {
    metrics: {},
    logs: []
  }
};

function emit(key) {
  const set = listeners.get(key);
  if (set) {
    for (const handler of Array.from(set)) {
      try {
        handler(state[key]);
      } catch (error) {
        console.error('state subscriber error', error);
      }
    }
  }
}

export function subscribe(key, handler) {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  const set = listeners.get(key);
  set.add(handler);
  return () => {
    set.delete(handler);
  };
}

export function getState(key) {
  return state[key];
}

export function setState(key, value) {
  state[key] = value;
  emit(key);
}

export function updateTelemetry(partial) {
  state.telemetry = {
    metrics: { ...state.telemetry.metrics, ...(partial.metrics || {}) },
    logs: partial.logs ? [...partial.logs, ...state.telemetry.logs].slice(0, 120) : state.telemetry.logs
  };
  emit('telemetry');
}
