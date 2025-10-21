const { randomUUID } = require('crypto');
const { EventEmitter } = require('events');
const { createError } = require('../errors/codes');
const { getGameById } = require('./gameService');
const { roomManager } = require('./roomService');

class MatchmakingService extends EventEmitter {
  constructor() {
    super();
    this.waitingQueues = new Map(); // gameId -> [ticket]
    this.ticketById = new Map();
    this.ticketByPlayer = new Map();
  }

  start({ playerId, gameId }) {
    const game = getGameById(gameId);
    if (!game) {
      throw createError('MATCH_GAME_NOT_FOUND');
    }
    if (this.ticketByPlayer.has(playerId)) {
      return this.ticketByPlayer.get(playerId);
    }
    const existingRoom = roomManager.getRoomForPlayer(playerId);
    if (existingRoom && existingRoom.status !== 'finished') {
      throw createError('MATCH_PLAYER_IN_ROOM', { meta: { roomId: existingRoom.id } });
    }

    const ticket = {
      id: randomUUID(),
      playerId,
      gameId,
      status: 'waiting',
      createdAt: Date.now(),
      roomId: null
    };
    this.ticketById.set(ticket.id, ticket);
    this.ticketByPlayer.set(playerId, ticket);

    const queue = this.waitingQueues.get(gameId) || [];
    queue.push(ticket);
    this.waitingQueues.set(gameId, queue);

    this.match(gameId, game);
    return ticket;
  }

  match(gameId, game) {
    const queue = this.waitingQueues.get(gameId) || [];
    while (queue.length >= game.maxPlayers) {
      const players = queue.splice(0, game.maxPlayers);
      const playerIds = players.map((ticket) => ticket.playerId);
      const room = roomManager.createRoom({ gameId, playerIds });
      const now = Date.now();
      players.forEach((ticket) => {
        ticket.status = 'matched';
        ticket.roomId = room.id;
        ticket.matchedAt = now;
        this.ticketByPlayer.delete(ticket.playerId);
        this.emit('matched', { ticket, room });
      });
    }
    if (queue.length === 0) {
      this.waitingQueues.delete(gameId);
    } else {
      this.waitingQueues.set(gameId, queue);
    }
  }

  cancel({ ticketId, playerId }) {
    const ticket = this.ticketById.get(ticketId);
    if (!ticket) {
      throw createError('MATCH_TICKET_NOT_FOUND');
    }
    if (ticket.playerId !== playerId) {
      throw createError('MATCH_TICKET_FORBIDDEN');
    }
    if (ticket.status === 'matched') {
      throw createError('MATCH_ALREADY_ASSIGNED', { meta: { roomId: ticket.roomId } });
    }
    this.ticketById.delete(ticketId);
    this.ticketByPlayer.delete(playerId);
    const queue = this.waitingQueues.get(ticket.gameId) || [];
    const remaining = queue.filter((entry) => entry.id !== ticketId);
    if (remaining.length > 0) {
      this.waitingQueues.set(ticket.gameId, remaining);
    } else {
      this.waitingQueues.delete(ticket.gameId);
    }
    return { cancelled: true };
  }

  getTicket(ticketId) {
    return this.ticketById.get(ticketId) || null;
  }

  clearPlayerTicket(playerId) {
    const ticket = this.ticketByPlayer.get(playerId);
    if (!ticket) {
      return;
    }
    this.ticketByPlayer.delete(playerId);
    this.ticketById.delete(ticket.id);
  }

  reset() {
    this.waitingQueues.clear();
    this.ticketById.clear();
    this.ticketByPlayer.clear();
  }
}

const matchmaker = new MatchmakingService();

module.exports = {
  matchmaker
};
