const { randomUUID } = require('crypto');
const { EventEmitter } = require('events');
const { createError } = require('../errors/codes');
const { getGameById } = require('./gameService');
const { createInitialState, applyMove, serializeBoard } = require('../engines/gomoku');

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
    const id = randomUUID();
    const now = Date.now();
    const players = playerIds.map((playerId, index) => ({
      id: playerId,
      seat: index,
      stone: index === 0 ? 'black' : 'white',
      ready: false,
      lastSeenAt: now
    }));
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
      result: null
    };
    this.rooms.set(id, room);
    players.forEach((player) => {
      this.playerRoom.set(player.id, id);
    });
    this.emitRoomEvent(room, 'room_created', { roomId: id, gameId, players: players.map((p) => ({ id: p.id, seat: p.seat, stone: p.stone })) });
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
    room.engineState = createInitialState();
    room.status = 'active';
    room.updatedAt = Date.now();
    this.emitRoomEvent(room, 'match_started', {
      roomId: room.id,
      gameId: room.gameId,
      players: room.players.map((p) => ({ id: p.id, stone: p.stone, seat: p.seat }))
    });
    const currentPlayer = room.players[room.engineState.nextPlayerIndex];
    this.emitRoomEvent(room, 'turn_started', {
      roomId: room.id,
      playerId: currentPlayer.id,
      stone: currentPlayer.stone
    });
  }

  applyPlayerAction({ roomId, playerId, x, y }) {
    const { room, player } = this.requireRoomMember(roomId, playerId);
    if (room.status !== 'active') {
      return { error: 'ROOM_NOT_ACTIVE', room };
    }
    const playerIndex = player.seat;
    const result = applyMove(room.engineState, { x, y, playerIndex });
    if (result.error) {
      this.emitRoomEvent(room, 'action_rejected', {
        roomId,
        playerId,
        reason: result.error,
        position: { x, y }
      });
      return { error: result.error, room };
    }
    room.engineState = result.state;
    room.updatedAt = Date.now();
    this.emitRoomEvent(room, 'action_applied', {
      roomId,
      playerId,
      stone: player.stone,
      position: { x, y },
      board: serializeBoard(room.engineState.board),
      moves: room.engineState.moves.map((move) => ({
        x: move.x,
        y: move.y,
        stone: move.playerIndex === 0 ? 'black' : 'white'
      }))
    });
    if (result.result) {
      room.status = 'finished';
      room.result = {
        winnerId: result.result.winner !== null ? room.players[result.result.winner].id : null,
        reason: result.result.reason,
        winningLine: result.result.winningLine
      };
      this.emitRoomEvent(room, 'match_result', {
        roomId,
        winnerId: room.result.winnerId,
        reason: room.result.reason,
        winningLine: room.result.winningLine
      });
    } else {
      const nextPlayer = room.players[room.engineState.nextPlayerIndex];
      this.emitRoomEvent(room, 'turn_started', {
        roomId,
        playerId: nextPlayer.id,
        stone: nextPlayer.stone
      });
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
    return {
      roomId: room.id,
      gameId: room.gameId,
      status: room.status,
      players: room.players.map((player) => ({
        id: player.id,
        seat: player.seat,
        stone: player.stone,
        ready: player.ready
      })),
      sequence: room.sequence,
      result: room.result,
      board: room.engineState ? serializeBoard(room.engineState.board) : null,
      moves: room.engineState
        ? room.engineState.moves.map((move) => ({
          x: move.x,
          y: move.y,
          stone: move.playerIndex === 0 ? 'black' : 'white'
        }))
        : [],
      nextTurnPlayerId: room.engineState && !room.engineState.finished
        ? room.players[room.engineState.nextPlayerIndex].id
        : null
    };
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
