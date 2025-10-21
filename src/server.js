const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { pipeline } = require('stream/promises');
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
const aiTraining = require('./services/aiService');
const audit = require('./services/auditService');
const adminConfig = require('./services/adminConfigService');
const i18n = require('./services/i18nService');
const { authenticateAdminRequest } = require('./utils/adminAuth');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function normalizeRequestPath(rawPath) {
  if (!rawPath || rawPath === '/') {
    return 'index.html';
  }
  const decoded = decodeURIComponent(rawPath);
  const normalized = path.posix.normalize(decoded);
  if (normalized === '/' || normalized === '.') {
    return 'index.html';
  }
  return normalized.startsWith('/') ? normalized.slice(1) : normalized;
}

function resolveStaticRoot() {
  const configured = process.env.STATIC_ROOT ? process.env.STATIC_ROOT.trim() : '';
  if (configured) {
    return path.resolve(configured);
  }
  return path.resolve(__dirname, '../app/dist');
}

async function tryServeStatic(req, res, url) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    return false;
  }
  let relativePath;
  try {
    relativePath = normalizeRequestPath(url.pathname);
  } catch (error) {
    return false;
  }
  if (relativePath.includes('\0')) {
    return false;
  }
  const segments = relativePath.split('/');
  if (segments.some((segment) => segment === '..')) {
    return false;
  }
  const staticRoot = resolveStaticRoot();
  const staticIndex = path.join(staticRoot, 'index.html');
  try {
    await fsp.access(staticIndex, fs.constants.R_OK);
  } catch (error) {
    return false;
  }

  let absolutePath = path.join(staticRoot, relativePath);
  if (!absolutePath.startsWith(staticRoot)) {
    return false;
  }

  let stats;
  try {
    stats = await fsp.stat(absolutePath);
    if (stats.isDirectory()) {
      absolutePath = path.join(absolutePath, 'index.html');
      stats = await fsp.stat(absolutePath);
    }
  } catch (error) {
    if (path.extname(relativePath) === '') {
      absolutePath = staticIndex;
      try {
        stats = await fsp.stat(absolutePath);
      } catch (fallbackError) {
        return false;
      }
    } else {
      return false;
    }
  }

  const isHtml = path.extname(absolutePath).toLowerCase() === '.html';
  const cacheControl = isHtml ? 'no-store, must-revalidate' : 'public, max-age=31536000, immutable';
  res.setHeader('Content-Type', getMimeType(absolutePath));
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Content-Length', stats.size);
  res.statusCode = 200;
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  const stream = fs.createReadStream(absolutePath);
  try {
    await pipeline(stream, res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: { code: 'STATIC_SERVE_FAILED', message: '静态资源加载失败' } }));
  }
  return true;
}
progression.ensureListener();
if (config.admin && typeof config.admin.fallbackLanguage === 'string') {
  i18n.setFallbackLanguage(config.admin.fallbackLanguage);
}

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

function resolveLanguage(req, url) {
  const queryLang = url.searchParams.get('lang');
  if (queryLang && queryLang.trim()) {
    return queryLang.trim();
  }
  const header = req.headers['accept-language'];
  if (typeof header === 'string' && header.trim()) {
    const [first] = header.split(',');
    if (first && first.trim()) {
      return first.trim();
    }
  }
  return null;
}

function executeAdminAction(action) {
  try {
    return action();
  } catch (error) {
    if (error && typeof error.code === 'string') {
      throw createError(error.code, { meta: error.meta });
    }
    throw error;
  }
}

async function handleAuthenticated(req, handler) {
  const session = authenticateHttpRequest(req);
  const playerId = session.payload.telegramUserId || session.payload.sub;
  if (playerId) {
    const banEntry = adminConfig.getBanEntry(playerId);
    if (banEntry) {
      throw createError('PLAYER_BANNED', {
        meta: { reason: banEntry.reason, expiresAt: banEntry.expiresAt || null }
      });
    }
  }
  return handler(session);
}

async function handleAdmin(req, handler) {
  authenticateAdminRequest(req);
  return handler();
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

  if (req.method === 'GET' && url.pathname === '/api/i18n') {
    try {
      const langParam = url.searchParams.get('lang') || '';
      const requested = langParam
        .split(',')
        .map((lang) => lang.trim())
        .filter((lang) => lang);
      const languages = requested.length > 0 ? Array.from(new Set(requested)) : [i18n.getFallbackLanguage()];
      const bundle = {};
      languages.forEach((lang) => {
        bundle[lang] = i18n.getLanguageBundle(lang);
      });
      respondSuccess(res, {
        version: i18n.getVersion(),
        fallbackLanguage: i18n.getFallbackLanguage(),
        availableLanguages: i18n.getAvailableLanguages(),
        supportedLanguages: config.admin?.supportedLanguages || [],
        resources: bundle
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/accessibility') {
    const accessibility = adminConfig.getAccessibilitySettings();
    respondSuccess(res, { accessibility });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/banners') {
    const lang = resolveLanguage(req, url);
    const bannerSnapshot = adminConfig.getBanners();
    const banners = adminConfig.getActiveBanners(Date.now(), { lang });
    respondSuccess(res, { version: bannerSnapshot.version, banners });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/announcement') {
    const lang = resolveLanguage(req, url);
    const announcementSnapshot = adminConfig.getAnnouncement();
    const announcement = adminConfig.getActiveAnnouncement(Date.now(), { lang });
    respondSuccess(res, { version: announcementSnapshot.version, announcement });
    return;
  }

  if (req.method === 'GET' && /^\/internal\/replay\/[\w-]+$/.test(url.pathname)) {
    const [, , , replayId] = url.pathname.split('/');
    const replay = audit.getReplay(replayId);
    if (!replay) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: { code: 'REPLAY_NOT_FOUND', message: 'Replay not found' } }));
      return;
    }
    respondSuccess(res, { replay });
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

  if (req.method === 'POST' && url.pathname === '/api/ai/suggest') {
    try {
      const body = await parseBody(req);
      await handleAuthenticated(req, ({ payload }) => {
        const playerId = payload.telegramUserId || payload.sub;
        const gameId = typeof body.gameId === 'string' ? body.gameId : 'gomoku';
        const moves = Array.isArray(body.moves)
          ? body.moves
          : Array.isArray(body.position?.moves)
            ? body.position.moves
            : undefined;
        const nextPlayer = body.nextPlayer ?? body.position?.nextPlayer ?? body.position?.playerToMove ?? null;
        const limit = body.limit !== undefined ? Number(body.limit) : undefined;
        const suggestion = aiTraining.getSuggestions({
          playerId,
          gameId,
          moves,
          nextPlayer,
          limit,
          mode: body.mode
        });
        respondSuccess(res, { suggestion });
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
        const lang = resolveLanguage(req, url);
        const tasks = progression.getTodayTasks(playerId, { lang });
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

  if (req.method === 'GET' && url.pathname === '/admin/tasks') {
    try {
      await handleAdmin(req, () => {
        respondSuccess(res, { tasks: adminConfig.getTaskConfig() });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/admin/tasks') {
    try {
      const body = await parseBody(req);
      await handleAdmin(req, () => {
        if (!Array.isArray(body.definitions)) {
          throw createError('ADMIN_PAYLOAD_INVALID', { meta: { reason: 'TASK_DEFINITION_REQUIRED' } });
        }
        executeAdminAction(() => adminConfig.setTaskDefinitions(body.definitions));
        respondSuccess(res, { tasks: adminConfig.getTaskConfig() });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/admin/banners') {
    try {
      await handleAdmin(req, () => {
        respondSuccess(res, { banners: adminConfig.getBanners() });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/admin/banners') {
    try {
      const body = await parseBody(req);
      await handleAdmin(req, () => {
        if (!Array.isArray(body.banners)) {
          throw createError('ADMIN_PAYLOAD_INVALID', { meta: { reason: 'BANNER_LIST_REQUIRED' } });
        }
        executeAdminAction(() => adminConfig.setBanners(body.banners));
        respondSuccess(res, { banners: adminConfig.getBanners() });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/admin/announcement') {
    try {
      await handleAdmin(req, () => {
        respondSuccess(res, { announcement: adminConfig.getAnnouncement() });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/admin/announcement') {
    try {
      const body = await parseBody(req);
      await handleAdmin(req, () => {
        executeAdminAction(() => adminConfig.updateAnnouncement(body));
        respondSuccess(res, { announcement: adminConfig.getAnnouncement() });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/admin/accessibility') {
    try {
      await handleAdmin(req, () => {
        respondSuccess(res, { accessibility: adminConfig.getAccessibilitySettings() });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/admin/accessibility') {
    try {
      const body = await parseBody(req);
      await handleAdmin(req, () => {
        executeAdminAction(() => adminConfig.updateAccessibilitySettings(body));
        respondSuccess(res, { accessibility: adminConfig.getAccessibilitySettings() });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/admin/bans') {
    try {
      await handleAdmin(req, () => {
        respondSuccess(res, { banned: adminConfig.listBannedPlayers() });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/admin/bans') {
    try {
      const body = await parseBody(req);
      await handleAdmin(req, () => {
        const action = typeof body.action === 'string' ? body.action.trim() : 'ban';
        const playerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';
        if (!playerId) {
          throw createError('ADMIN_PLAYER_REQUIRED');
        }
        let result;
        if (action === 'unban') {
          executeAdminAction(() => adminConfig.unbanPlayer(playerId));
          result = { playerId, status: 'unbanned' };
        } else {
          result = executeAdminAction(() =>
            adminConfig.banPlayer(playerId, { reason: body.reason, expiresAt: body.expiresAt })
          );
          result.status = 'banned';
        }
        respondSuccess(res, { result, banned: adminConfig.listBannedPlayers() });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/admin/i18n') {
    try {
      await handleAdmin(req, () => {
        const lang = url.searchParams.get('lang');
        if (lang && lang.trim()) {
          const trimmed = lang.trim();
          respondSuccess(res, {
            version: i18n.getVersion(),
            language: trimmed,
            resources: i18n.getLanguageBundle(trimmed)
          });
          return;
        }
        respondSuccess(res, {
          version: i18n.getVersion(),
          languages: i18n.getAvailableLanguages()
        });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/admin/i18n') {
    try {
      const body = await parseBody(req);
      await handleAdmin(req, () => {
        const lang = typeof body.lang === 'string' ? body.lang.trim() : '';
        if (!lang) {
          throw createError('I18N_LANG_REQUIRED');
        }
        const resources = body.resources && typeof body.resources === 'object' ? body.resources : null;
        if (!resources) {
          throw createError('I18N_PAYLOAD_INVALID');
        }
        executeAdminAction(() => i18n.updateResources(lang, resources));
        respondSuccess(res, {
          version: i18n.getVersion(),
          language: lang,
          resources: i18n.getLanguageBundle(lang)
        });
      });
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  if (await tryServeStatic(req, res, url)) {
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
