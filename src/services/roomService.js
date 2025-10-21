const { randomUUID } = require('crypto');
const { EventEmitter } = require('events');
const { createError } = require('../errors/codes');
const { getGameById } = require('./gameService');
const { getEngineAdapter } = require('../engines/registry');
const observability = require('./observability');
const antiCheat = require('./antiCheatService');
const audit = require('./auditService');
const social = require('./socialService');
const adminConfig = require('./adminConfigService');

const INVITE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_SPECTATOR_DELAY_MS = 1500;
const DEFAULT_SPECTATOR_LIMIT = 16;

function normaliseInviteCode(code) {
  if (typeof code !== 'string') {
    return null;
  }
  const trimmed = code.trim().toUpperCase();
  return trimmed.length >= 4 ? trimmed : null;
}

function generateInviteCode() {
  const length = 6;
  let code = '';
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * INVITE_CHARSET.length);
    code += INVITE_CHARSET[index];
  }
  return code;
}

function coerceNumber(value) {
  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : NaN;
  }
  if (Number.isFinite(value)) {
    return value;
  }
  return NaN;
}

function parseSpectatorDelay(value) {
  const coerced = coerceNumber(value);
  if (Number.isNaN(coerced)) {
    return DEFAULT_SPECTATOR_DELAY_MS;
  }
  const delay = Math.max(0, Math.floor(coerced));
  return Number.isFinite(delay) ? delay : DEFAULT_SPECTATOR_DELAY_MS;
}

function parseSpectatorLimit(value) {
  const coerced = coerceNumber(value);
  if (Number.isNaN(coerced)) {
    return DEFAULT_SPECTATOR_LIMIT;
  }
  const limit = Math.max(0, Math.floor(coerced));
  return Number.isFinite(limit) ? limit : DEFAULT_SPECTATOR_LIMIT;
}

function sanitizeIdempotencyKey(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, 128);
}

function normaliseFrameId(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) {
    return null;
  }
  return numeric;
}

function ensureActionGuards(room) {
  if (!room.actionGuards) {
    room.actionGuards = {
      frameByPlayer: new Map(),
      idempotencyByPlayer: new Map()
    };
  }
  return room.actionGuards;
}

function rebuildPlayers({ engine, gameId, playerIds, previousPlayers = [], timestamp = Date.now() }) {
  if (!engine || typeof engine.assignSeats !== 'function') {
    throw new Error('ENGINE_SEAT_ASSIGNMENT_MISSING');
  }
  const seatAssignments = engine.assignSeats({ gameId, playerIds });
  if (!Array.isArray(seatAssignments) || seatAssignments.length !== playerIds.length) {
    throw new Error('ENGINE_SEAT_ASSIGNMENT_INVALID');
  }
  const previousMap = new Map(previousPlayers.map((player) => [player.id, player]));
  return seatAssignments.map((assignment, index) => {
    const playerId = playerIds[index];
    const existing = previousMap.get(playerId) || {};
    if (!assignment || typeof assignment !== 'object') {
      throw new Error('ENGINE_SEAT_DESCRIPTOR_INVALID');
    }
    const seat = Number.isInteger(assignment.seat) ? assignment.seat : index;
    const attributes = assignment.attributes ? { ...assignment.attributes } : {};
    const base = {
      id: playerId,
      seat,
      ready: false,
      lastSeenAt: timestamp,
      attributes
    };
    Object.keys(assignment).forEach((key) => {
      if (key === 'seat' || key === 'attributes') {
        return;
      }
      base[key] = assignment[key];
    });
    Object.keys(existing).forEach((key) => {
      if (key === 'ready' || key === 'lastSeenAt' || key === 'seat') {
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(base, key)) {
        base[key] = existing[key];
      }
    });
    return base;
  });
}

function ensurePlayerNotBanned(playerId) {
  const banEntry = adminConfig.getBanEntry(playerId);
  if (banEntry) {
    throw createError('PLAYER_BANNED', {
      meta: { playerId, reason: banEntry.reason, expiresAt: banEntry.expiresAt || null }
    });
  }
}

class RoomManager extends EventEmitter {
  constructor() {
    super();
    this.rooms = new Map();
    this.playerRoom = new Map();
    this.inviteToRoom = new Map();
    this.spectatorRooms = new Map();
  }

  createRoom({
    gameId,
    playerIds,
    visibility = 'public',
    ownerId = null,
    allowSpectators = true,
    spectatorDelayMs,
    spectatorLimit,
    inviteCode = null
  }) {
    const game = getGameById(gameId);
    if (!game) {
      throw createError('MATCH_GAME_NOT_FOUND');
    }
    const engine = getEngineAdapter(gameId);
    if (!engine) {
      throw createError('MATCH_GAME_NOT_FOUND');
    }
    const uniquePlayers = Array.from(new Set((playerIds || []).filter((id) => typeof id === 'string' && id.trim() !== '')));
    if (uniquePlayers.length === 0) {
      throw new Error('ROOM_REQUIRES_PLAYER');
    }
    uniquePlayers.forEach((playerId) => ensurePlayerNotBanned(playerId));
    const id = randomUUID();
    const now = Date.now();
    const players = rebuildPlayers({ engine, gameId, playerIds: uniquePlayers, timestamp: now });
    const room = {
      id,
      gameId,
      status: 'waiting',
      createdAt: now,
      updatedAt: now,
      players,
      events: [],
      sequence: 0,
      engineState: null,
      result: null,
      engine,
      visibility,
      ownerId,
      allowSpectators: Boolean(allowSpectators),
      spectatorDelayMs: parseSpectatorDelay(spectatorDelayMs),
      spectatorLimit: parseSpectatorLimit(spectatorLimit),
      spectators: new Map(),
      minPlayers: Math.max(1, game.minPlayers || 1),
      maxPlayers: Math.max(uniquePlayers.length, game.maxPlayers || uniquePlayers.length),
      inviteCode: null,
      actionGuards: {
        frameByPlayer: new Map(),
        idempotencyByPlayer: new Map()
      },
      matchWaitRecorded: false
    };
    if (room.visibility === 'private') {
      room.inviteCode = this.assignInviteCode(room, inviteCode);
    }
    this.rooms.set(id, room);
    players.forEach((player) => {
      this.playerRoom.set(player.id, id);
    });
    const enginePlayerPayload = this.getPlayerPayload(room);
    const payload = {
      roomId: id,
      gameId,
      players: enginePlayerPayload,
      visibility: room.visibility,
      ownerId: room.ownerId,
      allowSpectators: room.allowSpectators,
      spectatorLimit: room.spectatorLimit,
      spectatorDelayMs: room.spectatorDelayMs
    };
    audit.registerRoom(room);
    observability.addLog('info', 'room_created', { roomId: id, gameId });
    this.emitRoomEvent(room, 'room_created', payload);
    return room;
  }

  getPlayerPayload(room) {
    if (!room) {
      return [];
    }
    if (room.engine && typeof room.engine.describePlayer === 'function') {
      return room.players.map((player) => room.engine.describePlayer(player));
    }
    return room.players.map((player) => ({ id: player.id, seat: player.seat, ready: player.ready }));
  }

  assignInviteCode(room, requestedCode) {
    if (!room || typeof room.id !== 'string') {
      throw new Error('ROOM_CONTEXT_REQUIRED');
    }
    const preferred = normaliseInviteCode(requestedCode);
    if (preferred && !this.inviteToRoom.has(preferred)) {
      this.inviteToRoom.set(preferred, room.id);
      return preferred;
    }
    let attempts = 0;
    let code = preferred || generateInviteCode();
    while (this.inviteToRoom.has(code)) {
      code = generateInviteCode();
      attempts += 1;
      if (attempts > 100) {
        throw new Error('INVITE_CODE_EXHAUSTED');
      }
    }
    this.inviteToRoom.set(code, room.id);
    return code;
  }

  findRoomByInvite(inviteCode) {
    const code = normaliseInviteCode(inviteCode);
    if (!code) {
      return null;
    }
    const roomId = this.inviteToRoom.get(code);
    if (!roomId) {
      return null;
    }
    return this.getRoom(roomId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  createPrivateRoom({ gameId, ownerId, allowSpectators = true, spectatorDelayMs, spectatorLimit }) {
    if (typeof ownerId !== 'string' || ownerId.trim() === '') {
      throw new Error('ROOM_OWNER_REQUIRED');
    }
    ensurePlayerNotBanned(ownerId);
    const existing = this.getRoomForPlayer(ownerId);
    if (existing && existing.status !== 'finished') {
      throw createError('MATCH_PLAYER_IN_ROOM', { meta: { roomId: existing.id } });
    }
    const room = this.createRoom({
      gameId,
      playerIds: [ownerId],
      visibility: 'private',
      ownerId,
      allowSpectators,
      spectatorDelayMs,
      spectatorLimit
    });
    return room;
  }

  getRoomForPlayer(playerId) {
    const roomId = this.playerRoom.get(playerId);
    if (!roomId) {
      return null;
    }
    return this.getRoom(roomId);
  }

  isPlayerBlocked(room, playerId) {
    if (!room) {
      return false;
    }
    if (room.ownerId && social.isMutuallyBlocked(room.ownerId, playerId)) {
      return true;
    }
    return room.players.some((player) => social.isMutuallyBlocked(player.id, playerId));
  }

  joinRoom({ roomId, inviteCode, playerId }) {
    let room = null;
    if (roomId) {
      room = this.getRoom(roomId);
    }
    if (!room && inviteCode) {
      room = this.findRoomByInvite(inviteCode);
    }
    if (!room) {
      if (inviteCode && !roomId) {
        throw createError('ROOM_INVITE_INVALID');
      }
      throw createError('ROOM_NOT_FOUND');
    }
    ensurePlayerNotBanned(playerId);
    if (room.visibility === 'private' && room.ownerId !== playerId) {
      const provided = normaliseInviteCode(inviteCode);
      if (!provided || room.inviteCode !== provided) {
        throw createError('ROOM_INVITE_INVALID');
      }
    }
    if (this.isPlayerBlocked(room, playerId)) {
      throw createError('ROOM_PLAYER_BLOCKED');
    }
    return this.addPlayerInternal(room, playerId);
  }

  addPlayerInternal(room, playerId) {
    if (!room) {
      throw createError('ROOM_NOT_FOUND');
    }
    ensurePlayerNotBanned(playerId);
    const existing = room.players.find((player) => player.id === playerId);
    if (existing) {
      existing.lastSeenAt = Date.now();
      return room;
    }
    if (room.status === 'active') {
      throw createError('ROOM_ALREADY_ACTIVE');
    }
    if (room.status === 'finished') {
      throw createError('ROOM_ALREADY_FINISHED');
    }
    if (room.players.length >= room.maxPlayers) {
      throw createError('ROOM_FULL');
    }
    const now = Date.now();
    const playerIds = room.players.map((player) => player.id).concat(playerId);
    const players = rebuildPlayers({
      engine: room.engine,
      gameId: room.gameId,
      playerIds,
      previousPlayers: room.players,
      timestamp: now
    });
    room.players = players.map((player) => ({
      ...player,
      ready: false,
      lastSeenAt: now
    }));
    room.players.forEach((player) => {
      this.playerRoom.set(player.id, room.id);
    });
    room.updatedAt = now;
    const payload = {
      roomId: room.id,
      playerId,
      players: this.getPlayerPayload(room)
    };
    this.emitRoomEvent(room, 'player_joined', payload);
    return room;
  }

  removePlayerInternal(room, playerId, reason = 'left') {
    if (!room) {
      throw createError('ROOM_NOT_FOUND');
    }
    const previousPlayers = room.players.slice();
    const remaining = previousPlayers.filter((player) => player.id !== playerId);
    if (remaining.length === previousPlayers.length) {
      return room;
    }
    this.playerRoom.delete(playerId);
    const now = Date.now();
    room.updatedAt = now;
    if (room.status === 'active') {
      room.status = 'waiting';
      room.engineState = null;
      room.result = null;
      this.emitRoomEvent(room, 'match_aborted', {
        roomId: room.id,
        playerId,
        reason: 'player_left'
      });
    } else if (room.status === 'finished') {
      room.status = 'waiting';
      room.engineState = null;
      room.result = null;
    }
    if (remaining.length > 0) {
      const playerIds = remaining.map((player) => player.id);
      const players = rebuildPlayers({
        engine: room.engine,
        gameId: room.gameId,
        playerIds,
        previousPlayers: remaining,
        timestamp: now
      });
      room.players = players.map((player) => ({
        ...player,
        ready: false,
        lastSeenAt: now
      }));
      room.players.forEach((player) => {
        this.playerRoom.set(player.id, room.id);
      });
    } else {
      room.players = [];
    }
    const payload = {
      roomId: room.id,
      playerId,
      reason
    };
    this.emitRoomEvent(room, 'player_removed', payload);
    return room;
  }

  leaveRoom({ roomId, playerId }) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw createError('ROOM_NOT_FOUND');
    }
    const member = room.players.find((player) => player.id === playerId);
    if (!member) {
      return room;
    }
    return this.removePlayerInternal(room, playerId, 'left');
  }

  kickPlayer({ roomId, operatorId, targetPlayerId }) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw createError('ROOM_NOT_FOUND');
    }
    if (room.ownerId !== operatorId) {
      throw createError('ROOM_NOT_OWNER');
    }
    if (targetPlayerId === operatorId) {
      return this.leaveRoom({ roomId, playerId: targetPlayerId });
    }
    return this.removePlayerInternal(room, targetPlayerId, 'kicked');
  }

  joinAsSpectator({ roomId, playerId, inviteCode }) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw createError('ROOM_NOT_FOUND');
    }
    if (!room.allowSpectators) {
      throw createError('ROOM_SPECTATORS_DISABLED');
    }
    if (room.players.some((player) => player.id === playerId)) {
      throw createError('ROOM_SPECTATOR_FORBIDDEN');
    }
    ensurePlayerNotBanned(playerId);
    if (room.visibility === 'private' && room.ownerId !== playerId) {
      const provided = normaliseInviteCode(inviteCode);
      if (!provided || room.inviteCode !== provided) {
        throw createError('ROOM_INVITE_INVALID');
      }
    }
    if (this.isPlayerBlocked(room, playerId)) {
      throw createError('ROOM_PLAYER_BLOCKED');
    }
    const now = Date.now();
    const existing = room.spectators.get(playerId);
    if (existing) {
      existing.lastSeenAt = now;
      return { room, spectator: existing, created: false, delayMs: room.spectatorDelayMs };
    }
    if (room.spectators.size >= room.spectatorLimit) {
      throw createError('ROOM_SPECTATORS_LIMIT');
    }
    const spectator = { id: playerId, joinedAt: now, lastSeenAt: now };
    room.spectators.set(playerId, spectator);
    let rooms = this.spectatorRooms.get(playerId);
    if (!rooms) {
      rooms = new Set();
      this.spectatorRooms.set(playerId, rooms);
    }
    rooms.add(room.id);
    room.updatedAt = now;
    this.emitRoomEvent(room, 'spectator_joined', {
      roomId: room.id,
      spectatorId: playerId,
      count: room.spectators.size
    });
    return { room, spectator, created: true, delayMs: room.spectatorDelayMs };
  }

  removeSpectator({ roomId, spectatorId }) {
    const room = this.getRoom(roomId);
    if (!room) {
      return;
    }
    const spectator = room.spectators.get(spectatorId);
    if (!spectator) {
      return;
    }
    room.spectators.delete(spectatorId);
    const rooms = this.spectatorRooms.get(spectatorId);
    if (rooms) {
      rooms.delete(roomId);
      if (rooms.size === 0) {
        this.spectatorRooms.delete(spectatorId);
      }
    }
    room.updatedAt = Date.now();
    this.emitRoomEvent(room, 'spectator_left', {
      roomId: room.id,
      spectatorId,
      count: room.spectators.size
    });
  }

  updateRoomSettings({ roomId, operatorId, allowSpectators, spectatorDelayMs, spectatorLimit }) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw createError('ROOM_NOT_FOUND');
    }
    if (room.ownerId !== operatorId) {
      throw createError('ROOM_NOT_OWNER');
    }
    let changed = false;
    if (typeof allowSpectators === 'boolean' && room.allowSpectators !== allowSpectators) {
      room.allowSpectators = allowSpectators;
      changed = true;
      if (!allowSpectators) {
        Array.from(room.spectators.keys()).forEach((spectatorId) => {
          this.removeSpectator({ roomId, spectatorId });
        });
      }
    }
    if (spectatorDelayMs !== undefined) {
      const parsedDelay = parseSpectatorDelay(spectatorDelayMs);
      if (parsedDelay !== room.spectatorDelayMs) {
        room.spectatorDelayMs = parsedDelay;
        changed = true;
      }
    }
    if (spectatorLimit !== undefined) {
      const parsedLimit = parseSpectatorLimit(spectatorLimit);
      if (parsedLimit !== room.spectatorLimit) {
        room.spectatorLimit = parsedLimit;
        changed = true;
        if (room.spectators.size > room.spectatorLimit) {
          const overflow = room.spectators.size - room.spectatorLimit;
          if (overflow > 0) {
            const removalOrder = Array.from(room.spectators.values())
              .sort((a, b) => a.joinedAt - b.joinedAt)
              .slice(-overflow);
            removalOrder.forEach((spectator) => {
              this.removeSpectator({ roomId, spectatorId: spectator.id });
            });
          }
        }
      }
    }
    if (!changed) {
      return room;
    }
    room.updatedAt = Date.now();
    this.emitRoomEvent(room, 'room_settings_updated', {
      roomId: room.id,
      allowSpectators: room.allowSpectators,
      spectatorDelayMs: room.spectatorDelayMs,
      spectatorLimit: room.spectatorLimit
    });
    return room;
  }

  requireRoomMember(roomId, playerId) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw createError('ROOM_NOT_FOUND');
    }
    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      throw createError('ROOM_NOT_MEMBER');
    }
    player.lastSeenAt = Date.now();
    return { room, player };
  }

  setPlayerReady({ roomId, playerId }) {
    const { room, player } = this.requireRoomMember(roomId, playerId);
    if (room.status === 'finished') {
      throw createError('ROOM_ALREADY_FINISHED');
    }
    if (player.ready) {
      return room;
    }
    player.ready = true;
    room.updatedAt = Date.now();
    this.emitRoomEvent(room, 'player_ready', { roomId, playerId });
    if (room.players.length >= room.minPlayers && room.players.every((p) => p.ready)) {
      this.startMatch(room);
    }
    return room;
  }

  startMatch(room) {
    if (room.status === 'active') {
      return;
    }
    if (room.players.length < room.minPlayers) {
      return;
    }
    if (!room.engine || typeof room.engine.createInitialState !== 'function') {
      throw new Error('ENGINE_MISSING_CREATE_STATE');
    }
    room.result = null;
    room.engineState = room.engine.createInitialState({ room });
    room.status = 'active';
    room.updatedAt = Date.now();
    room.matchStartedAt = room.updatedAt;
    const waitDuration = room.matchStartedAt - room.createdAt;
    if (!room.matchWaitRecorded) {
      observability.recordHistogram('match_wait_ms', waitDuration, { gameId: room.gameId });
      room.matchWaitRecorded = true;
    }
    const startPayload = room.engine.describeMatchStart({ room, state: room.engineState });
    this.emitRoomEvent(room, 'match_started', startPayload);
    const turnInfo = room.engine.getTurnInfo({ room, state: room.engineState });
    if (turnInfo) {
      this.emitRoomEvent(room, 'turn_started', turnInfo);
    }
  }

  applyPlayerAction({ roomId, playerId, action, idempotencyKey, clientFrame }) {
    const { room, player } = this.requireRoomMember(roomId, playerId);
    if (room.status !== 'active') {
      return { error: 'ROOM_NOT_ACTIVE', room };
    }
    if (!room.engine) {
      throw new Error('ENGINE_NOT_INITIALIZED');
    }
    const playerIndex = room.players.findIndex((p) => p.id === player.id);
    if (playerIndex === -1) {
      throw new Error('PLAYER_INDEX_NOT_FOUND');
    }
    const guard = ensureActionGuards(room);
    const frameId = normaliseFrameId(clientFrame);
    const key = sanitizeIdempotencyKey(idempotencyKey);
    const span = observability.startSpan('room.apply_action', {
      roomId: room.id,
      playerId,
      gameId: room.gameId
    });
    span.addEvent('action_received', { hasFrame: frameId !== null, hasKey: Boolean(key) });
    const frameMap = guard.frameByPlayer;
    const previousFrame = frameMap.get(player.id) || 0;
    let keyMap = null;
    if (key) {
      keyMap = guard.idempotencyByPlayer.get(player.id) || null;
      if (keyMap && keyMap.has(key)) {
        const anomaly = antiCheat.recordAnomaly({
          roomId: room.id,
          playerId,
          type: 'idempotency_replay',
          severity: 'info',
          details: { key }
        });
        observability.addLog('info', 'action_duplicate_ignored', {
          roomId: room.id,
          playerId,
          idempotencyKey: key,
          fingerprint: anomaly.fingerprint
        });
        this.emitRoomEvent(room, 'action_rejected', {
          roomId,
          playerId,
          reason: 'ACTION_DUPLICATE',
          action,
          fingerprint: anomaly.fingerprint,
          idempotencyKey: key
        });
        span.addEvent('guard_rejected', { reason: 'duplicate', idempotencyKey: key });
        span.end({ statusCode: 'ERROR', message: 'duplicate_action' });
        return { error: 'ACTION_DUPLICATE', room };
      }
    }
    if (frameId !== null) {
      const expected = previousFrame + 1;
      if (frameId < expected) {
        const anomaly = antiCheat.recordAnomaly({
          roomId: room.id,
          playerId,
          type: 'frame_replay',
          details: { expected, received: frameId }
        });
        observability.addLog('warn', 'action_frame_replay', {
          roomId: room.id,
          playerId,
          expectedFrame: expected,
          receivedFrame: frameId,
          fingerprint: anomaly.fingerprint
        });
        this.emitRoomEvent(room, 'action_rejected', {
          roomId,
          playerId,
          reason: 'ACTION_FRAME_REPLAYED',
          action,
          fingerprint: anomaly.fingerprint,
          expectedFrame: expected,
          receivedFrame: frameId
        });
        span.addEvent('guard_rejected', { reason: 'frame_replayed', expectedFrame: expected, receivedFrame: frameId });
        span.end({ statusCode: 'ERROR', message: 'frame_replayed' });
        return { error: 'ACTION_FRAME_REPLAYED', room };
      }
      if (frameId > expected) {
        const anomaly = antiCheat.recordAnomaly({
          roomId: room.id,
          playerId,
          type: 'frame_out_of_sync',
          details: { expected, received: frameId }
        });
        observability.addLog('warn', 'action_frame_out_of_sync', {
          roomId: room.id,
          playerId,
          expectedFrame: expected,
          receivedFrame: frameId,
          fingerprint: anomaly.fingerprint
        });
        this.emitRoomEvent(room, 'action_rejected', {
          roomId,
          playerId,
          reason: 'ACTION_FRAME_OUT_OF_SYNC',
          action,
          fingerprint: anomaly.fingerprint,
          expectedFrame: expected,
          receivedFrame: frameId
        });
        span.addEvent('guard_rejected', { reason: 'frame_out_of_sync', expectedFrame: expected, receivedFrame: frameId });
        span.end({ statusCode: 'ERROR', message: 'frame_out_of_sync' });
        return { error: 'ACTION_FRAME_OUT_OF_SYNC', room };
      }
    }
    const outcome = room.engine.applyAction({ room, state: room.engineState, players: room.players, playerIndex, action, player });
    if (outcome.error) {
      this.emitRoomEvent(room, 'action_rejected', {
        roomId,
        playerId,
        reason: outcome.error,
        action
      });
      span.addEvent('engine_rejected', { reason: outcome.error });
      span.end({ statusCode: 'ERROR', message: outcome.error });
      return { error: outcome.error, room };
    }
    room.engineState = outcome.state;
    room.updatedAt = Date.now();
    if (frameId !== null) {
      frameMap.set(player.id, frameId);
    }
    if (key) {
      if (!keyMap) {
        keyMap = new Map();
        guard.idempotencyByPlayer.set(player.id, keyMap);
      }
      keyMap.set(key, { sequence: room.sequence + 1, frame: frameId });
    }
    if (Array.isArray(outcome.events)) {
      outcome.events.forEach((event) => {
        if (!event || typeof event.type !== 'string') {
          return;
        }
        this.emitRoomEvent(room, event.type, event.payload || {});
      });
    }
    if (outcome.result) {
      room.status = 'finished';
      const { summary, eventPayload } = room.engine.describeResult({ room, state: room.engineState, result: outcome.result });
      room.result = summary;
      this.emitRoomEvent(room, 'match_result', eventPayload || {});
      if (room.matchStartedAt) {
        const duration = Date.now() - room.matchStartedAt;
        observability.recordHistogram('match_duration_ms', duration, { gameId: room.gameId });
      }
    } else {
      const turnInfo = room.engine.getTurnInfo({ room, state: room.engineState });
      if (turnInfo) {
        this.emitRoomEvent(room, 'turn_started', turnInfo);
      }
    }
    span.addEvent('action_applied', { sequence: room.sequence });
    span.end({ statusCode: 'OK' });
    return { room };
  }

  emitRoomEvent(room, type, payload) {
    room.sequence += 1;
    const event = {
      sequence: room.sequence,
      type,
      payload,
      timestamp: Date.now()
    };
    room.events.push(event);
    audit.appendEvent({ room, event });
    observability.addLog('debug', 'room_event', { roomId: room.id, sequence: event.sequence, type });
    this.emit('event', {
      roomId: room.id,
      room,
      event
    });
  }

  getRoomSnapshot(roomId) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw createError('ROOM_NOT_FOUND');
    }
    return this.buildPublicState(room);
  }

  buildPublicState(room) {
    const playerPayloads = room.engine && typeof room.engine.describePlayer === 'function'
      ? room.players.map((player) => room.engine.describePlayer(player))
      : room.players.map((player) => ({ id: player.id, seat: player.seat, ready: player.ready }));
    const statePayload = room.engine && typeof room.engine.getPublicState === 'function'
      ? room.engine.getPublicState({ room, state: room.engineState })
      : {};
    const snapshot = {
      roomId: room.id,
      gameId: room.gameId,
      status: room.status,
      players: playerPayloads,
      sequence: room.sequence,
      result: room.result,
      state: statePayload,
      visibility: room.visibility,
      ownerId: room.ownerId,
      allowSpectators: room.allowSpectators,
      spectatorCount: room.spectators ? room.spectators.size : 0,
      spectatorLimit: room.spectatorLimit,
      spectatorDelayMs: room.spectatorDelayMs,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      nextTurnPlayerId: statePayload && Object.prototype.hasOwnProperty.call(statePayload, 'nextTurnPlayerId')
        ? statePayload.nextTurnPlayerId
        : null
    };
    if (statePayload && Object.prototype.hasOwnProperty.call(statePayload, 'board')) {
      snapshot.board = statePayload.board;
    }
    if (statePayload && Object.prototype.hasOwnProperty.call(statePayload, 'moves')) {
      snapshot.moves = statePayload.moves;
    }
    if (statePayload && Object.prototype.hasOwnProperty.call(statePayload, 'handCounts')) {
      snapshot.handCounts = statePayload.handCounts;
    }
    if (statePayload && Object.prototype.hasOwnProperty.call(statePayload, 'community')) {
      snapshot.community = statePayload.community;
    }
    if (statePayload && Object.prototype.hasOwnProperty.call(statePayload, 'currentSeat')) {
      snapshot.currentSeat = statePayload.currentSeat;
    }
    return snapshot;
  }

  listRoomsForPlayer(playerId) {
    const room = this.getRoomForPlayer(playerId);
    if (!room) {
      return [];
    }
    return [this.buildPublicState(room)];
  }

  listSpectatingRooms(playerId) {
    const roomIds = this.spectatorRooms.get(playerId);
    if (!roomIds || roomIds.size === 0) {
      return [];
    }
    const snapshots = [];
    roomIds.forEach((roomId) => {
      const room = this.getRoom(roomId);
      if (room) {
        snapshots.push(this.buildPublicState(room));
      }
    });
    return snapshots;
  }

  getEventsSince(roomId, sequence) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw createError('ROOM_NOT_FOUND');
    }
    return room.events.filter((event) => event.sequence > sequence);
  }

  reset() {
    this.rooms.clear();
    this.playerRoom.clear();
    this.inviteToRoom.clear();
    this.spectatorRooms.clear();
  }
}

const roomManager = new RoomManager();

module.exports = {
  roomManager
};
