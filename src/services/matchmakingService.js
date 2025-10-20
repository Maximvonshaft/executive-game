const { EventEmitter } = require('events');
const { randomUUID } = require('crypto');
const { ApplicationError } = require('../errors/codes');

class MatchmakingService extends EventEmitter {
  constructor({ gameService, clock = () => Date.now() }) {
    super();
    this.gameService = gameService;
    this.clock = clock;
    this.queues = new Map(); // gameId -> [ticket]
    this.ticketsByPlayer = new Map(); // playerId -> ticket
  }

  startMatch(playerId, gameId) {
    const game = this.gameService.ensureGameAvailable(gameId);
    if (!game) {
      throw new ApplicationError('MATCH_UNSUPPORTED_GAME');
    }
    if (this.ticketsByPlayer.has(playerId)) {
      throw new ApplicationError('MATCH_ALREADY_SEARCHING');
    }
    const ticket = {
      id: randomUUID(),
      playerId,
      gameId,
      createdAt: this.clock()
    };
    this.ticketsByPlayer.set(playerId, ticket);
    const queue = this.queues.get(gameId) || [];
    queue.push(ticket);
    this.queues.set(gameId, queue);
    this.emit('queueUpdated', { gameId, size: queue.length });
    this.tryMatch(game, queue);
    const status = this.ticketsByPlayer.has(playerId) ? 'searching' : 'matched';
    return {
      ticketId: ticket.id,
      status
    };
  }

  cancelMatch(playerId) {
    const ticket = this.ticketsByPlayer.get(playerId);
    if (!ticket) {
      throw new ApplicationError('MATCH_NOT_IN_QUEUE');
    }
    const queue = this.queues.get(ticket.gameId) || [];
    const index = queue.findIndex((entry) => entry.playerId === playerId);
    if (index >= 0) {
      queue.splice(index, 1);
    }
    if (queue.length === 0) {
      this.queues.delete(ticket.gameId);
    }
    this.ticketsByPlayer.delete(playerId);
    this.emit('queueUpdated', { gameId: ticket.gameId, size: queue.length });
    return { cancelled: true };
  }

  tryMatch(game, queue) {
    while (queue.length >= game.minPlayers) {
      const participants = queue.splice(0, game.minPlayers);
      participants.forEach((ticket) => this.ticketsByPlayer.delete(ticket.playerId));
      const match = {
        id: randomUUID(),
        gameId: game.id,
        createdAt: this.clock(),
        playerIds: participants.map((ticket) => ticket.playerId)
      };
      this.emit('matchFound', { match, game });
    }
    if (queue.length === 0) {
      this.queues.delete(game.id);
    }
  }
}

module.exports = {
  MatchmakingService
};
