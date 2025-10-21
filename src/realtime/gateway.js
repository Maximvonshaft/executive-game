const { URL } = require('url');
const { createWebSocketServer } = require('./simpleWebSocketServer');
const { authenticateToken } = require('../utils/auth');
const { ApplicationError } = require('../errors/codes');
const { roomManager } = require('../services/roomService');
const observability = require('../services/observability');

function createMessage(type, payload) {
  return JSON.stringify({ type, ...payload });
}

function extractPlayerId(payload) {
  return payload.telegramUserId || payload.sub;
}

function setupRealtime(server) {
  const connections = new Map();
  const roomSubscribers = new Map();
  const activeConnections = new Set();

  function subscribe(roomId, context, options = {}) {
    let subscribers = roomSubscribers.get(roomId);
    if (!subscribers) {
      subscribers = new Set();
      roomSubscribers.set(roomId, subscribers);
    }
    subscribers.add(context);
    const existing = context.subscriptions.get(roomId);
    if (existing && existing.timer) {
      clearTimeout(existing.timer);
    }
    const isSpectator = Boolean(options.spectator);
    const rawDelay = Number(options.delayMs);
    const delayMs = isSpectator && Number.isFinite(rawDelay) && rawDelay > 0 ? rawDelay : 0;
    context.subscriptions.set(roomId, {
      spectator: isSpectator,
      delayMs,
      lastSentAt: 0,
      timer: null,
      buffered: null
    });
  }

  function unsubscribeRoom(context, roomId, options = {}) {
    const subscription = context.subscriptions.get(roomId);
    if (!subscription) {
      return;
    }
    const subscribers = roomSubscribers.get(roomId);
    if (subscribers) {
      subscribers.delete(context);
      if (subscribers.size === 0) {
        roomSubscribers.delete(roomId);
      }
    }
    if (subscription.timer) {
      clearTimeout(subscription.timer);
    }
    if (subscription.spectator && !options.skipManager) {
      try {
        roomManager.removeSpectator({ roomId, spectatorId: context.playerId });
      } catch (error) {
        // ignore removal errors
      }
    }
    context.subscriptions.delete(roomId);
  }

  function unsubscribeAll(context) {
    Array.from(context.subscriptions.keys()).forEach((roomId) => {
      unsubscribeRoom(context, roomId);
    });
  }

  function scheduleSpectatorMessage(context, roomId, subscription, message) {
    const now = Date.now();
    const delayMs = subscription.delayMs || 0;
    if (delayMs <= 0 || !subscription.spectator) {
      context.connection.sendText(message);
      subscription.lastSentAt = now;
      return;
    }
    if (!subscription.lastSentAt || now - subscription.lastSentAt >= delayMs) {
      context.connection.sendText(message);
      subscription.lastSentAt = now;
      return;
    }
    subscription.buffered = message;
    if (!subscription.timer) {
      const remaining = Math.max(0, delayMs - (now - subscription.lastSentAt));
      subscription.timer = setTimeout(() => {
        subscription.timer = null;
        if (subscription.buffered) {
          const buffered = subscription.buffered;
          subscription.buffered = null;
          try {
            context.connection.sendText(buffered);
            subscription.lastSentAt = Date.now();
          } catch (error) {
            // ignore send errors for buffered messages
          }
        }
      }, remaining);
    }
  }

  function sendMessageToContext(context, roomId, message) {
    const subscription = context.subscriptions.get(roomId);
    if (!subscription || !subscription.spectator) {
      context.connection.sendText(message);
      if (subscription) {
        subscription.lastSentAt = Date.now();
      }
      return;
    }
    scheduleSpectatorMessage(context, roomId, subscription, message);
  }

  function handleJoinRoom(context, message) {
    const { roomId, sinceSeq } = message;
    if (!roomId) {
      context.connection.sendText(createMessage('error', { code: 'ROOM_ID_REQUIRED' }));
      return;
    }
    try {
      const snapshot = roomManager.getRoomSnapshot(roomId);
      const isMember = snapshot.players.some((player) => player.id === context.playerId);
      if (!isMember) {
        context.connection.sendText(createMessage('error', { code: 'ROOM_NOT_MEMBER' }));
        return;
      }
      unsubscribeRoom(context, roomId);
      subscribe(roomId, context, { spectator: false });
      context.connection.sendText(createMessage('room_state', { sequence: snapshot.sequence, state: snapshot, role: 'player' }));
      if (Number.isInteger(sinceSeq) && sinceSeq < snapshot.sequence) {
        const events = roomManager.getEventsSince(roomId, sinceSeq);
        events.forEach((event) => {
          const messagePayload = createMessage(event.type, { sequence: event.sequence, payload: event.payload });
          sendMessageToContext(context, roomId, messagePayload);
        });
      }
    } catch (error) {
      if (error instanceof ApplicationError) {
        context.connection.sendText(createMessage('error', { code: error.code }));
      } else {
        context.connection.sendText(createMessage('error', { code: 'SERVER_ERROR' }));
      }
    }
  }

  function handleWatchRoom(context, message) {
    const { roomId, inviteCode, sinceSeq } = message;
    if (!roomId && !inviteCode) {
      context.connection.sendText(createMessage('error', { code: 'ROOM_ID_REQUIRED' }));
      return;
    }
    try {
      let room = null;
      if (roomId) {
        room = roomManager.getRoom(roomId);
      }
      if (!room && inviteCode) {
        room = roomManager.findRoomByInvite(inviteCode);
      }
      if (!room) {
        if (inviteCode && !roomId) {
          context.connection.sendText(createMessage('error', { code: 'ROOM_INVITE_INVALID' }));
        } else {
          context.connection.sendText(createMessage('error', { code: 'ROOM_NOT_FOUND' }));
        }
        return;
      }
      const result = roomManager.joinAsSpectator({ roomId: room.id, playerId: context.playerId, inviteCode });
      unsubscribeRoom(context, room.id);
      subscribe(room.id, context, { spectator: true, delayMs: result.delayMs });
      const snapshot = roomManager.buildPublicState(result.room);
      context.connection.sendText(createMessage('room_state', { sequence: snapshot.sequence, state: snapshot, role: 'spectator' }));
      if (Number.isInteger(sinceSeq) && sinceSeq < snapshot.sequence) {
        const events = roomManager.getEventsSince(room.id, sinceSeq);
        events.forEach((event) => {
          const messagePayload = createMessage(event.type, { sequence: event.sequence, payload: event.payload });
          sendMessageToContext(context, room.id, messagePayload);
        });
      }
    } catch (error) {
      if (error instanceof ApplicationError) {
        context.connection.sendText(createMessage('error', { code: error.code }));
      } else {
        context.connection.sendText(createMessage('error', { code: 'SERVER_ERROR' }));
      }
    }
  }

  function handleReady(context, message) {
    const { roomId } = message;
    if (!roomId) {
      context.connection.sendText(createMessage('error', { code: 'ROOM_ID_REQUIRED' }));
      return;
    }
    try {
      const subscription = context.subscriptions.get(roomId);
      if (!subscription || subscription.spectator) {
        context.connection.sendText(createMessage('error', { code: 'ROOM_SPECTATOR_FORBIDDEN' }));
        return;
      }
      roomManager.setPlayerReady({ roomId, playerId: context.playerId });
    } catch (error) {
      if (error instanceof ApplicationError) {
        context.connection.sendText(createMessage('error', { code: error.code }));
      } else {
        context.connection.sendText(createMessage('error', { code: 'SERVER_ERROR' }));
      }
    }
  }

  function handlePlayAction(context, message) {
    const { roomId } = message;
    if (!roomId) {
      context.connection.sendText(createMessage('error', { code: 'ACTION_INVALID' }));
      return;
    }
    let { action } = message;
    if (!action && message.position) {
      action = { position: message.position };
    }
    if (!action || typeof action !== 'object') {
      context.connection.sendText(createMessage('error', { code: 'ACTION_INVALID' }));
      return;
    }
    try {
      const subscription = context.subscriptions.get(roomId);
      if (!subscription || subscription.spectator) {
        context.connection.sendText(createMessage('error', { code: 'ROOM_SPECTATOR_FORBIDDEN' }));
        return;
      }
      roomManager.applyPlayerAction({
        roomId,
        playerId: context.playerId,
        action,
        idempotencyKey: message.idempotencyKey,
        clientFrame: message.clientFrame
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        context.connection.sendText(createMessage('error', { code: error.code }));
      } else {
        context.connection.sendText(createMessage('error', { code: 'SERVER_ERROR' }));
      }
    }
  }

  function handleRequestState(context, message) {
    const { roomId, sinceSeq = 0 } = message;
    if (!roomId) {
      context.connection.sendText(createMessage('error', { code: 'ROOM_ID_REQUIRED' }));
      return;
    }
    try {
      const events = roomManager.getEventsSince(roomId, sinceSeq);
      if (events.length > 0) {
        const first = events[0];
        const last = events[events.length - 1];
        const recoveryMs = Math.max(0, last.timestamp - first.timestamp);
        observability.recordHistogram('disconnect_recovery_ms', recoveryMs, {
          roomId,
          eventCount: events.length
        });
      }
      events.forEach((event) => {
        const messagePayload = createMessage(event.type, { sequence: event.sequence, payload: event.payload });
        sendMessageToContext(context, roomId, messagePayload);
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        context.connection.sendText(createMessage('error', { code: error.code }));
      } else {
        context.connection.sendText(createMessage('error', { code: 'SERVER_ERROR' }));
      }
    }
  }

  function handleMessage(context, raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch (error) {
      context.connection.sendText(createMessage('error', { code: 'MESSAGE_MALFORMED' }));
      return;
    }
    switch (message.type) {
      case 'join_room':
        handleJoinRoom(context, message);
        break;
      case 'watch_room':
        handleWatchRoom(context, message);
        break;
      case 'ready':
        handleReady(context, message);
        break;
      case 'play_action':
        handlePlayAction(context, message);
        break;
      case 'request_state':
        handleRequestState(context, message);
        break;
      case 'ping': {
        const clientTimestamp = Number(message.clientTimestamp);
        if (Number.isFinite(clientTimestamp)) {
          const latency = Math.max(0, Date.now() - clientTimestamp);
          observability.recordHistogram('ws_latency_ms', latency, { playerId: context.playerId });
        } else {
          observability.recordHistogram('ws_latency_ms', 0, { playerId: context.playerId });
        }
        context.connection.sendText(createMessage('pong', { timestamp: Date.now() }));
        break;
      }
      default:
        context.connection.sendText(createMessage('error', { code: 'MESSAGE_UNSUPPORTED' }));
        break;
    }
  }

  createWebSocketServer(server, {
    onConnection(connection, req) {
      let payload;
      try {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname !== '/ws') {
          connection.sendText(createMessage('error', { code: 'NOT_FOUND' }));
          connection.close();
          return;
        }
        const token = url.searchParams.get('token');
        if (!token) {
          connection.sendText(createMessage('error', { code: 'AUTH_TOKEN_REQUIRED' }));
          connection.close();
          return;
        }
        payload = authenticateToken(token);
      } catch (error) {
        connection.sendText(createMessage('error', { code: 'AUTH_TOKEN_INVALID' }));
        connection.close();
        return;
      }
      const playerId = extractPlayerId(payload);
      if (!playerId) {
        connection.sendText(createMessage('error', { code: 'AUTH_TOKEN_INVALID' }));
        connection.close();
        return;
      }
      const context = {
        connection,
        playerId,
        payload,
        subscriptions: new Map()
      };
      connections.set(connection, context);
      activeConnections.add(connection);
      connection.on('message', (message) => {
        try {
          handleMessage(context, message);
        } catch (error) {
          connection.sendText(createMessage('error', { code: 'SERVER_ERROR' }));
        }
      });
      connection.on('close', () => {
        unsubscribeAll(context);
        connections.delete(connection);
        activeConnections.delete(connection);
      });
      connection.on('error', () => {});
    }
  });

  const forwardEvent = ({ roomId, event }) => {
    const subscribers = roomSubscribers.get(roomId);
    if (!subscribers) {
      return;
    }
    const message = createMessage(event.type, { sequence: event.sequence, payload: event.payload });
    subscribers.forEach((context) => {
      const subscription = context.subscriptions.get(roomId);
      if (!subscription) {
        return;
      }
      if (event.type === 'spectator_left' && event.payload && event.payload.spectatorId === context.playerId) {
        try {
          context.connection.sendText(message);
        } catch (error) {
          // ignore send error on forced leave
        }
        unsubscribeRoom(context, roomId, { skipManager: true });
        return;
      }
      sendMessageToContext(context, roomId, message);
    });
  };

  roomManager.on('event', forwardEvent);

  server.on('close', () => {
    roomManager.off('event', forwardEvent);
  });

  function shutdown() {
    activeConnections.forEach((conn) => {
      try {
        conn.close();
      } catch (error) {
        // ignore close errors during shutdown
      }
    });
    activeConnections.clear();
  }

  return { shutdown };
}

module.exports = {
  setupRealtime
};
