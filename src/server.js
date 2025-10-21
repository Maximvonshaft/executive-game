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

  if (req.method === 'GET' && url.pathname === '/api/rooms') {
    try {
      await handleAuthenticated(req, ({ payload }) => {
        const playerId = payload.telegramUserId || payload.sub;
        const rooms = roomManager.listRoomsForPlayer(playerId);
        respondSuccess(res, { rooms });
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
        const roomId = typeof body.roomId === 'string' ? body.roomId : null;
        if (!roomId) {
          throw createError('ROOM_ID_REQUIRED');
        }
        const snapshot = roomManager.getRoomSnapshot(roomId);
        const isMember = snapshot.players.some((player) => player.id === playerId);
        if (!isMember) {
          throw createError('ROOM_NOT_MEMBER');
        }
        respondSuccess(res, { room: snapshot });
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
