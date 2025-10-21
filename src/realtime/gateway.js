const { URL } = require('url');
const { createWebSocketServer } = require('./simpleWebSocketServer');
const { authenticateToken } = require('../utils/auth');
const { ApplicationError } = require('../errors/codes');
const { roomManager } = require('../services/roomService');

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

  function subscribe(roomId, context) {
    let subscribers = roomSubscribers.get(roomId);
    if (!subscribers) {
      subscribers = new Set();
      roomSubscribers.set(roomId, subscribers);
    }
    subscribers.add(context);
    context.rooms.add(roomId);
  }

  function unsubscribeAll(context) {
    context.rooms.forEach((roomId) => {
      const subscribers = roomSubscribers.get(roomId);
      if (!subscribers) {
        return;
      }
      subscribers.delete(context);
      if (subscribers.size === 0) {
        roomSubscribers.delete(roomId);
      }
    });
    context.rooms.clear();
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
      subscribe(roomId, context);
      context.connection.sendText(createMessage('room_state', { sequence: snapshot.sequence, state: snapshot }));
      if (Number.isInteger(sinceSeq) && sinceSeq < snapshot.sequence) {
        const events = roomManager.getEventsSince(roomId, sinceSeq);
        events.forEach((event) => {
          context.connection.sendText(createMessage(event.type, { sequence: event.sequence, payload: event.payload }));
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
      roomManager.applyPlayerAction({ roomId, playerId: context.playerId, action });
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
      events.forEach((event) => {
        context.connection.sendText(createMessage(event.type, { sequence: event.sequence, payload: event.payload }));
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
      case 'ready':
        handleReady(context, message);
        break;
      case 'play_action':
        handlePlayAction(context, message);
        break;
      case 'request_state':
        handleRequestState(context, message);
        break;
      case 'ping':
        context.connection.sendText(createMessage('pong', { timestamp: Date.now() }));
        break;
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
        rooms: new Set()
      };
      connections.set(connection, context);
      activeConnections.add(connection);
      connection.on('message', (message) => {
        handleMessage(context, message);
      });
      connection.on('close', () => {
        unsubscribeAll(context);
        connections.delete(connection);
        activeConnections.delete(connection);
      });
    }
  });

  const forwardEvent = ({ roomId, event }) => {
    const subscribers = roomSubscribers.get(roomId);
    if (!subscribers) {
      return;
    }
    const message = createMessage(event.type, { sequence: event.sequence, payload: event.payload });
    subscribers.forEach((context) => {
      context.connection.sendText(message);
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
