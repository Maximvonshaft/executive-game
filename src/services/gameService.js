const GAMES = [
  {
    id: 'gomoku',
    name: 'Gomoku',
    displayName: '五子棋',
    description: '15x15 棋盘，连五取胜。',
    minPlayers: 2,
    maxPlayers: 2,
    turnOrder: 'sequential',
    rulesVersion: 'v1',
    metadata: {
      boardSize: 15,
      firstMove: 'black',
      timeLimitSeconds: 45
    }
  }
];

function listGames() {
  return GAMES.map((game) => ({ ...game }));
}

function getGameById(id) {
  return GAMES.find((game) => game.id === id) || null;
}

module.exports = {
  listGames,
  getGameById
};
