const { EventEmitter } = require('events');
const { randomUUID } = require('crypto');
const { ApplicationError } = require('../errors/codes');
const { createInitialState, placeStone, buildSnapshot } = require('../engine/gomoku');

class RoomService extends EventEmitter {
  constructor({ gameService, clock = () => Date.now() }) {
    super();
    this.gameService = gameService;
    this.clock = clock;
    this.rooms = new Map();
  }

  createMatchRoom(gameId, playerIds) {
    const game = this.gameService.ensureGameAvailable(gameId);
    if (!game) {
      throw new ApplicationError('MATCH_UNSUPPORTED_GAME');
    }
    const id = randomUUID();
    const readyState = new Map(playerIds.map((pid) => [pid, false]));
    const stones = {};
    playerIds.forEach((pid, index) => {
      stones[pid] = index === 0 ? 'black' : 'white';
    });
    const engineState = createInitialState({ size: game.meta.boardSize });
    const room = {
      id,
      gameId,
      status: 'waiting',
      createdAt: this.clock(),
      updatedAt: this.clock(),
      seats: playerIds.slice(),
      readyState,
      stones,
      engineState,
      nextPlayerId: null,
      winner: null,
      moveHistory: [],
      finishedAt: null,
      sequence: 0
    };
    this.rooms.set(id, room);
    room.nextPlayerId = this.getNextPlayerId(room);
    this.emit('roomCreated', { room: this.buildState(room) });
    return room;
  }

  listRooms() {
    return Array.from(this.rooms.values()).map((room) => this.buildSummary(room));
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  ensureRoom(roomId) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new ApplicationError('ROOM_NOT_FOUND');
    }
    return room;
  }

  ensureMembership(room, playerId) {
    if (!room.seats.includes(playerId)) {
      throw new ApplicationError('ROOM_NOT_MEMBER');
    }
  }

  joinRoom(roomId, playerId) {
    const room = this.ensureRoom(roomId);
    this.ensureMembership(room, playerId);
    return this.buildState(room);
  }

  markReady(roomId, playerId) {
    const room = this.ensureRoom(roomId);
    this.ensureMembership(room, playerId);
    if (room.status !== 'waiting') {
      throw new ApplicationError('ROOM_ACTION_INVALID');
    }
    if (room.readyState.get(playerId)) {
      throw new ApplicationError('ROOM_ALREADY_READY');
    }
    room.readyState.set(playerId, true);
    room.updatedAt = this.clock();
    const everyoneReady = room.seats.every((pid) => room.readyState.get(pid));
    let started = false;
    if (everyoneReady) {
      room.status = 'in_progress';
      started = true;
      room.updatedAt = this.clock();
    }
    room.sequence += 1;
    const nextPlayerId = this.getNextPlayerId(room);
    room.nextPlayerId = nextPlayerId;
    const snapshot = this.buildState(room);
    if (started) {
      this.emit('roomStarted', { room: snapshot });
    } else {
      this.emit('roomUpdated', { room: snapshot });
    }
    return { state: snapshot, started, nextPlayerId };
  }

  getNextPlayerId(room) {
    if (room.engineState.nextStone === null) {
      return null;
    }
    const stone = room.engineState.nextStone;
    const entry = Object.entries(room.stones).find(([, value]) => value === stone);
    return entry ? entry[0] : null;
  }

  applyAction(roomId, playerId, action) {
    const room = this.ensureRoom(roomId);
    this.ensureMembership(room, playerId);
    if (room.status !== 'in_progress') {
      throw new ApplicationError('ROOM_ACTION_INVALID');
    }
    if (room.nextPlayerId !== playerId) {
      throw new ApplicationError('ROOM_ACTION_OUT_OF_TURN');
    }
    const stone = room.stones[playerId];
    if (!stone) {
      throw new ApplicationError('ROOM_ACTION_INVALID');
    }
    const { x, y } = action;
    let engineState;
    try {
      engineState = placeStone(room.engineState, { stone, x, y });
    } catch (error) {
      throw new ApplicationError('ROOM_ACTION_INVALID', { cause: error });
    }
    room.engineState = engineState;
    room.moveHistory.push({ playerId, stone, x, y, playedAt: this.clock() });
    room.sequence += 1;
    room.updatedAt = this.clock();
    room.nextPlayerId = this.getNextPlayerId(room);
    let result = null;
    if (engineState.winner) {
      room.status = 'completed';
      room.winner = playerId;
      room.finishedAt = this.clock();
      room.nextPlayerId = null;
      result = { type: 'win', playerId, winningLine: engineState.winningLine };
      this.emit('roomFinished', { room: this.buildState(room), result });
    } else if (engineState.finished) {
      room.status = 'completed';
      room.winner = null;
      room.finishedAt = this.clock();
      room.nextPlayerId = null;
      result = { type: 'draw' };
      this.emit('roomFinished', { room: this.buildState(room), result });
    } else {
      this.emit('roomUpdated', { room: this.buildState(room) });
    }
    return {
      state: this.buildState(room),
      move: { playerId, stone, x, y },
      result,
      nextPlayerId: room.nextPlayerId
    };
  }

  buildSummary(room) {
    return {
      id: room.id,
      gameId: room.gameId,
      status: room.status,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      seats: room.seats.map((playerId) => ({
        playerId,
        ready: room.readyState.get(playerId),
        stone: room.stones[playerId] || null
      })),
      winner: room.winner
    };
  }

  buildState(room) {
    return {
      id: room.id,
      gameId: room.gameId,
      status: room.status,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      sequence: room.sequence,
      players: room.seats.map((playerId) => ({
        playerId,
        ready: room.readyState.get(playerId),
        stone: room.stones[playerId]
      })),
      nextPlayerId: room.nextPlayerId,
      winner: room.winner,
      finishedAt: room.finishedAt,
      engine: buildSnapshot(room.engineState),
      moves: room.moveHistory.slice()
    };
  }
}

module.exports = {
  RoomService
};
