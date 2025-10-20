const DEFAULT_GAMES = [
  {
    id: 'gomoku',
    name: '五子棋',
    category: 'board',
    minPlayers: 2,
    maxPlayers: 2,
    shortDescription: '15x15 棋盘对弈，先连成五子者胜。',
    meta: {
      boardSize: 15,
      openingRule: 'freestyle',
      winningLength: 5
    }
  }
];

class GameService {
  constructor(games = DEFAULT_GAMES) {
    this.games = games.map((game) => ({ ...game }));
    this.index = new Map(this.games.map((game) => [game.id, game]));
  }

  listGames() {
    return this.games.map((game) => ({ ...game }));
  }

  getGame(gameId) {
    return this.index.get(gameId) || null;
  }

  ensureGameAvailable(gameId) {
    const game = this.getGame(gameId);
    if (!game) {
      return null;
    }
    return game;
  }
}

module.exports = {
  GameService,
  DEFAULT_GAMES
};
