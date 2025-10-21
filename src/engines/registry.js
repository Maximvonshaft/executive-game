const gomokuAdapter = require('./gomokuAdapter');
const doudizhuAdapter = require('./doudizhu');
const texasHoldemAdapter = require('./texasHoldem');
const chineseChessAdapter = require('./chineseChess');
const chessAdapter = require('./chess');

const ENGINE_REGISTRY = new Map([
  ['gomoku', gomokuAdapter],
  ['doudizhu', doudizhuAdapter],
  ['texas_holdem', texasHoldemAdapter],
  ['chinese_chess', chineseChessAdapter],
  ['chess', chessAdapter]
]);

function getEngineAdapter(gameId) {
  return ENGINE_REGISTRY.get(gameId) || null;
}

module.exports = {
  getEngineAdapter
};
