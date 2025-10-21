const http = require('http');
const { URL } = require('url');
const { config } = require('./config/env');
const { ApplicationError, ERROR_CODES, createError } = require('./errors/codes');
const { authenticateWithTelegram } = require('./services/authService');
const { listGames, getGameById, getGameMeta } = require('./services/gameService');
const { matchmaker } = require('./services/matchService');
const { roomManager } = require('./services/roomService');
const { authenticateHttpRequest } = require('./utils/auth');
const { setupRealtime } = require('./realtime/gateway');
const progression = require('./services/progression');
const social = require('./services/socialService');
progression.ensureListener();

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', config.securityHeaders.contentSecurityPolicy);
  res.setHeader('Permissions-Policy', config.securityHeaders.permissionsPolicy);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const json = JSON.parse(raw);
        resolve(json);
      } catch (error) {
        reject(new ApplicationError('REQUEST_BODY_INVALID', { cause: error }));
      }
    });
    req.on('error', (error) => {
      reject(error);
    });
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function respondSuccess(res, data) {
  sendJson(res, 200, { success: true, data });
}

function handleError(error, res) {
  const isAppError = error instanceof ApplicationError;
  const definition = isAppError ? error : new ApplicationError('SERVER_ERROR', { cause: error });
  const payload = {
    success: false,
    error: {
      code: definition.code,
      message: definition.userMessage,
      details: definition.meta || null
    }
  };
  res.statusCode = definition.httpStatus || ERROR_CODES.SERVER_ERROR.httpStatus;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function formatTicket(ticket) {
  return {
    ticketId: ticket.id,
    status: ticket.status,
    gameId: ticket.gameId,
    roomId: ticket.roomId || null,
    createdAt: ticket.createdAt,
    matchedAt: ticket.matchedAt || null
  };
}

function decorateRoomSnapshot(snapshot, role, playerId) {
  const view = { ...snapshot, role };
  if (role === 'player' && snapshot.ownerId === playerId) {
    const room = roomManager.getRoom(snapshot.roomId);
    if (room && room.inviteCode) {
      view.inviteCode = room.inviteCode;
    }
  }
  return view;
}

async function handleAuthenticated(req, handler) {
  const session = authenticateHttpRequest(req);
  return handler(session);
}

async function requestHandler(req, res) {
  setSecurityHeaders(res);
  const origin = req.headers.host ? `http://${req.headers.host}` : 'http://localhost';
  const url = new URL(req.url, origin);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/healthz') {
    respondSuccess(res, { status: 'ok', env: config.env });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/games') {
    respondSuccess(res, { games: listGames() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/leaderboard') {
    try {
      const scope = url.searchParams.get('scope') || 'overall';
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
      const leaderboard = progression.getLeaderboardView(scope, limit);
      respondSuccess(res, { leaderboard });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'GET' && /^\/api\/profile\/[\w-]+$/.test(url.pathname)) {
    try {
      const [, , , playerId] = url.pathname.split('/');
      const profile = progression.getProfile(playerId);
      respondSuccess(res, { profile });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'GET' && /^\/api\/games\/[\w-]+\/meta$/.test(url.pathname)) {
    try {
      const [, , , gameId, metaSegment] = url.pathname.split('/');
      if (metaSegment !== 'meta') {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: '资源不存在' } }));
        return;
      }
      const meta = getGameMeta(gameId);
      if (!meta) {
        throw createError('MATCH_GAME_NOT_FOUND');
      }
      respondSuccess(res, { game: meta });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/telegram') {
    try {
      const body = await parseBody(req);
      const initData = body.initData;
      if (typeof initData !== 'string') {
        throw new ApplicationError('AUTH_INITDATA_REQUIRED');
      }
      const session = authenticateWithTelegram(initData);
      respondSuccess(res, session);
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/match/start') {
    try {
      const body = await parseBody(req);
      await handleAuthenticated(req, ({ payload }) => {
        const playerId = payload.telegramUserId || payload.sub;
        const gameId = typeof body.gameId === 'string' ? body.gameId : 'gomoku';
        if (!getGameById(gameId)) {
          throw createError('MATCH_GAME_NOT_FOUND');
        }
        const ticket = matchmaker.start({ playerId, gameId });
        respondSuccess(res, { ticket: formatTicket(ticket) });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/match/cancel') {
    try {
      const body = await parseBody(req);
      await handleAuthenticated(req, ({ payload }) => {
        const playerId = payload.telegramUserId || payload.sub;
        const ticketId = typeof body.ticketId === 'string' ? body.ticketId : body.ticketId?.ticketId;
        if (!ticketId) {
          throw createError('MATCH_TICKET_NOT_FOUND');
        }
        const result = matchmaker.cancel({ ticketId, playerId });
        respondSuccess(res, result);
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/rooms') {
    try {
      const body = await parseBody(req);
      await handleAuthenticated(req, ({ payload }) => {
        const playerId = payload.telegramUserId || payload.sub;
        const action = typeof body.action === 'string' ? body.action : 'create';
        if (action === 'create') {
          const gameId = typeof body.gameId === 'string' ? body.gameId : 'gomoku';
          if (!getGameById(gameId)) {
            throw createError('MATCH_GAME_NOT_FOUND');
          }
          const allowSpectators = body.allowSpectators !== undefined ? Boolean(body.allowSpectators) : true;
          const spectatorDelayMs = body.spectatorDelayMs !== undefined ? Number(body.spectatorDelayMs) : undefined;
          const spectatorLimit = body.spectatorLimit !== undefined ? Number(body.spectatorLimit) : undefined;
          const room = roomManager.createPrivateRoom({
            gameId,
            ownerId: playerId,
            allowSpectators,
            spectatorDelayMs,
            spectatorLimit
          });
          const snapshot = decorateRoomSnapshot(roomManager.buildPublicState(room), 'player', playerId);
          respondSuccess(res, { room: snapshot });
          return;
        }
        if (action === 'kick') {
          const roomId = typeof body.roomId === 'string' ? body.roomId : null;
          const targetPlayerId = typeof body.targetPlayerId === 'string' ? body.targetPlayerId : null;
          if (!roomId) {
            throw createError('ROOM_ID_REQUIRED');
          }
          if (!targetPlayerId) {
            throw createError('FRIEND_TARGET_REQUIRED');
          }
          const room = roomManager.kickPlayer({ roomId, operatorId: playerId, targetPlayerId });
          const snapshot = decorateRoomSnapshot(roomManager.buildPublicState(room), 'player', playerId);
          respondSuccess(res, { room: snapshot });
          return;
        }
        if (action === 'leave') {
          const roomId = typeof body.roomId === 'string' ? body.roomId : null;
          if (!roomId) {
            throw createError('ROOM_ID_REQUIRED');
          }
          roomManager.leaveRoom({ roomId, playerId });
          const playing = roomManager
            .listRoomsForPlayer(playerId)
            .map((snapshot) => decorateRoomSnapshot(snapshot, 'player', playerId));
          const spectating = roomManager
            .listSpectatingRooms(playerId)
            .map((snapshot) => decorateRoomSnapshot(snapshot, 'spectator', playerId));
          respondSuccess(res, { rooms: playing, spectating });
          return;
        }
        if (action === 'update') {
          const roomId = typeof body.roomId === 'string' ? body.roomId : null;
          if (!roomId) {
            throw createError('ROOM_ID_REQUIRED');
          }
          const room = roomManager.updateRoomSettings({
            roomId,
            operatorId: playerId,
            allowSpectators: body.allowSpectators,
            spectatorDelayMs: body.spectatorDelayMs,
            spectatorLimit: body.spectatorLimit
          });
          const snapshot = decorateRoomSnapshot(roomManager.buildPublicState(room), 'player', playerId);
          respondSuccess(res, { room: snapshot });
          return;
        }
        throw createError('ROOM_ACTION_UNSUPPORTED');
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/rooms') {
    try {
      await handleAuthenticated(req, ({ payload }) => {
        const playerId = payload.telegramUserId || payload.sub;
        const playing = roomManager
          .listRoomsForPlayer(playerId)
          .map((snapshot) => decorateRoomSnapshot(snapshot, 'player', playerId));
        const spectating = roomManager
          .listSpectatingRooms(playerId)
          .map((snapshot) => decorateRoomSnapshot(snapshot, 'spectator', playerId));
        respondSuccess(res, { rooms: playing, spectating });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/rooms/join') {
    try {
      const body = await parseBody(req);
      await handleAuthenticated(req, ({ payload }) => {
        const playerId = payload.telegramUserId || payload.sub;
        const requestedRoomId = typeof body.roomId === 'string' ? body.roomId : null;
        const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode : null;
        const asSpectator = body.asSpectator === true;
        if (!requestedRoomId && !inviteCode) {
          throw createError('ROOM_ID_REQUIRED');
        }
        let room = null;
        if (requestedRoomId) {
          room = roomManager.getRoom(requestedRoomId);
        }
        if (!room && inviteCode) {
          room = roomManager.findRoomByInvite(inviteCode);
        }
        if (!room) {
          if (inviteCode && !requestedRoomId) {
            throw createError('ROOM_INVITE_INVALID');
          }
          throw createError('ROOM_NOT_FOUND');
        }
        if (asSpectator) {
          const result = roomManager.joinAsSpectator({ roomId: room.id, playerId, inviteCode });
          const snapshot = decorateRoomSnapshot(roomManager.buildPublicState(result.room), 'spectator', playerId);
          respondSuccess(res, { room: snapshot, role: 'spectator', spectator: { delayMs: result.delayMs } });
          return;
        }
        const joinedRoom = roomManager.joinRoom({ roomId: room.id, inviteCode, playerId });
        const snapshot = decorateRoomSnapshot(roomManager.buildPublicState(joinedRoom), 'player', playerId);
        respondSuccess(res, { room: snapshot, role: 'player' });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/friends') {
    try {
      await handleAuthenticated(req, ({ payload }) => {
        const playerId = payload.telegramUserId || payload.sub;
        const overview = social.getOverview(playerId);
        respondSuccess(res, overview);
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/friends') {
    try {
      const body = await parseBody(req);
      await handleAuthenticated(req, ({ payload }) => {
        const playerId = payload.telegramUserId || payload.sub;
        const action = typeof body.action === 'string' ? body.action : 'add';
        const targetId = typeof body.playerId === 'string' ? body.playerId : null;
        function ensureTarget() {
          if (!targetId) {
            throw createError('FRIEND_TARGET_REQUIRED');
          }
        }
        function mapResult(result) {
          return result || {};
        }
        function wrap(fn) {
          try {
            return fn();
          } catch (err) {
            if (err && typeof err.code === 'string') {
              throw createError(err.code);
            }
            throw err;
          }
        }
        let result;
        switch (action) {
          case 'add':
            ensureTarget();
            result = wrap(() => social.addFriend(playerId, targetId));
            break;
          case 'remove':
            ensureTarget();
            result = social.removeFriend(playerId, targetId);
            break;
          case 'block':
            ensureTarget();
            result = social.blockPlayer(playerId, targetId);
            break;
          case 'unblock':
            ensureTarget();
            result = social.unblockPlayer(playerId, targetId);
            break;
          default:
            throw createError('ROOM_ACTION_UNSUPPORTED');
        }
        const overview = social.getOverview(playerId);
        respondSuccess(res, { result: mapResult(result), overview });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/tasks/today') {
    try {
      await handleAuthenticated(req, ({ payload }) => {
        const playerId = payload.telegramUserId || payload.sub;
        const tasks = progression.getTodayTasks(playerId);
        respondSuccess(res, { tasks });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && /^\/api\/tasks\/[\w-]+\/claim$/.test(url.pathname)) {
    try {
      const [, , , taskId, action] = url.pathname.split('/');
      if (action !== 'claim') {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: '资源不存在' } }));
        return;
      }
      await handleAuthenticated(req, ({ payload }) => {
        const playerId = payload.telegramUserId || payload.sub;
        const claim = progression.claimTaskReward(playerId, taskId);
        respondSuccess(res, { claim });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: '资源不存在' } }));
}

function startServer() {
  const server = http.createServer((req, res) => {
    requestHandler(req, res).catch((error) => {
      handleError(error, res);
    });
  });
  const realtime = setupRealtime(server);
  server.realtimeShutdown = realtime.shutdown;
  server.listen(config.port, () => {
    process.stdout.write(`Server listening on port ${config.port} (env: ${config.env})\n`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer
};
