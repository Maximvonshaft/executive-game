const { randomUUID } = require('crypto');
const { EventEmitter } = require('events');
const { createError } = require('../errors/codes');
const { getGameById } = require('./gameService');
const { roomManager } = require('./roomService');
const observability = require('./observability');
const adminConfig = require('./adminConfigService');

class MatchmakingService extends EventEmitter {
  constructor() {
    super();
    this.waitingQueues = new Map(); // gameId -> [ticket]
    this.ticketById = new Map();
    this.ticketByPlayer = new Map();
  }

  start({ playerId, gameId }) {
    const span = observability.startSpan('matchmaker.start', { playerId, gameId });
    const game = getGameById(gameId);
    if (!game) {
      span.recordException(new Error('MATCH_GAME_NOT_FOUND'));
      span.end({ statusCode: 'ERROR', message: 'MATCH_GAME_NOT_FOUND' });
      throw createError('MATCH_GAME_NOT_FOUND');
    }
    const banEntry = adminConfig.getBanEntry(playerId);
    if (banEntry) {
      span.recordException(new Error('PLAYER_BANNED'));
      span.end({ statusCode: 'ERROR', message: 'PLAYER_BANNED' });
      throw createError('PLAYER_BANNED', {
        meta: { reason: banEntry.reason, expiresAt: banEntry.expiresAt || null }
      });
    }
    if (this.ticketByPlayer.has(playerId)) {
      const existing = this.ticketByPlayer.get(playerId);
      span.addEvent('ticket_reused', { ticketId: existing.id });
      span.end({ statusCode: 'OK' });
      return this.ticketByPlayer.get(playerId);
    }
    const existingRoom = roomManager.getRoomForPlayer(playerId);
    if (existingRoom && existingRoom.status !== 'finished') {
      span.recordException(new Error('MATCH_PLAYER_IN_ROOM'));
      span.end({ statusCode: 'ERROR', message: 'MATCH_PLAYER_IN_ROOM' });
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
    span.addEvent('ticket_created', { ticketId: ticket.id });

    const queue = this.waitingQueues.get(gameId) || [];
    queue.push(ticket);
    this.waitingQueues.set(gameId, queue);

    this.match(gameId, game);
    span.end({ statusCode: 'OK' });
    return ticket;
  }

  match(gameId, game) {
    const queue = this.waitingQueues.get(gameId) || [];
    const minPlayers = Math.max(1, game.minPlayers || 1);
    const preferred = Math.max(minPlayers, game.matchPlayers || game.maxPlayers || minPlayers);
    while (queue.length >= minPlayers) {
      const seatCount = Math.min(queue.length, preferred);
      const players = queue.splice(0, seatCount);
      const playerIds = players.map((ticket) => ticket.playerId);
      const room = roomManager.createRoom({ gameId, playerIds });
      const now = Date.now();
      players.forEach((ticket) => {
        ticket.status = 'matched';
        ticket.roomId = room.id;
        ticket.matchedAt = now;
        this.ticketByPlayer.delete(ticket.playerId);
        const waitDuration = ticket.matchedAt - ticket.createdAt;
        observability.recordHistogram('match_wait_ms', waitDuration, { gameId });
        this.emit('matched', { ticket, room });
      });
      room.matchWaitRecorded = true;
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
