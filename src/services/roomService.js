const { randomUUID } = require('crypto');
const { EventEmitter } = require('events');
const { createError } = require('../errors/codes');
const { getGameById } = require('./gameService');
const { getEngineAdapter } = require('../engines/registry');

class RoomManager extends EventEmitter {
  constructor() {
    super();
    this.rooms = new Map();
    this.playerRoom = new Map();
  }

  createRoom({ gameId, playerIds }) {
    const game = getGameById(gameId);
    if (!game) {
      throw createError('MATCH_GAME_NOT_FOUND');
    }
    const engine = getEngineAdapter(gameId);
    if (!engine) {
      throw createError('MATCH_GAME_NOT_FOUND');
    }
    const seatAssignments = engine.assignSeats({ gameId, playerIds });
    if (!Array.isArray(seatAssignments) || seatAssignments.length !== playerIds.length) {
      throw new Error('ENGINE_SEAT_ASSIGNMENT_INVALID');
    }
    const id = randomUUID();
    const now = Date.now();
    const players = seatAssignments.map((assignment, index) => {
      if (!assignment || typeof assignment !== 'object') {
        throw new Error('ENGINE_SEAT_DESCRIPTOR_INVALID');
      }
      const seat = Number.isInteger(assignment.seat) ? assignment.seat : index;
      const base = {
        id: playerIds[index],
        seat,
        ready: false,
        lastSeenAt: now,
        attributes: assignment.attributes ? { ...assignment.attributes } : {}
      };
      Object.keys(assignment).forEach((key) => {
        if (key === 'seat' || key === 'attributes') {
          return;
        }
        base[key] = assignment[key];
      });
      return base;
    });
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
      engine
    };
    this.rooms.set(id, room);
    players.forEach((player) => {
      this.playerRoom.set(player.id, id);
    });
    const enginePlayerPayload = room.engine && typeof room.engine.describePlayer === 'function'
      ? room.players.map((player) => room.engine.describePlayer(player))
      : room.players.map((player) => ({ id: player.id, seat: player.seat, ready: player.ready }));
    this.emitRoomEvent(room, 'room_created', { roomId: id, gameId, players: enginePlayerPayload });
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  getRoomForPlayer(playerId) {
    const roomId = this.playerRoom.get(playerId);
    if (!roomId) {
      return null;
    }
    return this.getRoom(roomId);
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
    this.emitRoomEvent(room, 'player_ready', { roomId, playerId });
    if (room.players.every((p) => p.ready)) {
      this.startMatch(room);
    }
    return room;
  }

  startMatch(room) {
    if (room.status === 'active') {
      return;
    }
    if (!room.engine || typeof room.engine.createInitialState !== 'function') {
      throw new Error('ENGINE_MISSING_CREATE_STATE');
    }
    room.engineState = room.engine.createInitialState({ room });
    room.status = 'active';
    room.updatedAt = Date.now();
    const startPayload = room.engine.describeMatchStart({ room, state: room.engineState });
    this.emitRoomEvent(room, 'match_started', startPayload);
    const turnInfo = room.engine.getTurnInfo({ room, state: room.engineState });
    if (turnInfo) {
      this.emitRoomEvent(room, 'turn_started', turnInfo);
    }
  }

  applyPlayerAction({ roomId, playerId, action }) {
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
    const outcome = room.engine.applyAction({ room, state: room.engineState, players: room.players, playerIndex, action, player });
    if (outcome.error) {
      this.emitRoomEvent(room, 'action_rejected', {
        roomId,
        playerId,
        reason: outcome.error,
        action
      });
      return { error: outcome.error, room };
    }
    room.engineState = outcome.state;
    room.updatedAt = Date.now();
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
    } else {
      const turnInfo = room.engine.getTurnInfo({ room, state: room.engineState });
      if (turnInfo) {
        this.emitRoomEvent(room, 'turn_started', turnInfo);
      }
    }
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
  }
}

const roomManager = new RoomManager();

module.exports = {
  roomManager
};
