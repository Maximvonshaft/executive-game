const test = require('node:test');
const assert = require('node:assert');

const { GameService } = require('../src/services/gameService');
const { MatchmakingService } = require('../src/services/matchmakingService');
const { RoomService } = require('../src/services/roomService');

const clock = () => Date.now();

function createServices() {
  const gameService = new GameService();
  const roomService = new RoomService({ gameService, clock });
  const matchService = new MatchmakingService({ gameService, clock });
  return { gameService, roomService, matchService };
}

test('matchmaking pairs players and room flows to victory', () => {
  const { roomService, matchService } = createServices();
  let createdRoom = null;
  matchService.on('matchFound', ({ match }) => {
    createdRoom = roomService.createMatchRoom(match.gameId, match.playerIds);
  });
  const ticket1 = matchService.startMatch('player-1', 'gomoku');
  assert.strictEqual(ticket1.status, 'searching');
  matchService.startMatch('player-2', 'gomoku');
  assert.ok(createdRoom, 'room should be created when enough players join');
  const roomState = roomService.joinRoom(createdRoom.id, 'player-1');
  assert.strictEqual(roomState.players.length, 2);
  const ready1 = roomService.markReady(createdRoom.id, 'player-1');
  assert.strictEqual(ready1.started, false);
  const ready2 = roomService.markReady(createdRoom.id, 'player-2');
  assert.strictEqual(ready2.started, true);
  assert.strictEqual(ready2.nextPlayerId, 'player-1');
  const moves = [
    { playerId: 'player-1', x: 0, y: 0 },
    { playerId: 'player-2', x: 0, y: 1 },
    { playerId: 'player-1', x: 1, y: 0 },
    { playerId: 'player-2', x: 1, y: 1 },
    { playerId: 'player-1', x: 2, y: 0 },
    { playerId: 'player-2', x: 2, y: 1 },
    { playerId: 'player-1', x: 3, y: 0 },
    { playerId: 'player-2', x: 3, y: 1 },
    { playerId: 'player-1', x: 4, y: 0 }
  ];
  let lastResult = null;
  for (const move of moves) {
    const outcome = roomService.applyAction(createdRoom.id, move.playerId, { x: move.x, y: move.y });
    lastResult = outcome.result;
  }
  assert.ok(lastResult);
  assert.strictEqual(lastResult.type, 'win');
  assert.strictEqual(lastResult.playerId, 'player-1');
  const finalState = roomService.joinRoom(createdRoom.id, 'player-1');
  assert.strictEqual(finalState.winner, 'player-1');
  assert.strictEqual(finalState.engine.winner, 'black');
});
