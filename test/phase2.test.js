const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'test-secret';
process.env.TELEGRAM_BOT_TOKEN = '123456:ABCDEF';
process.env.TELEGRAM_LOGIN_TTL = '3600';
process.env.APP_ENV = 'development';
process.env.PORT = '0';

const { createToken, connectWebSocket, waitForType, withServer } = require('../tests/support/server');

function buildDoudizhuHands() {
  const suits = ['S', 'H', 'C', 'D'];
  const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  const deck = [];
  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      deck.push(`${suit}${rank}`);
    });
  });
  deck.push('BJ');
  deck.push('RJ');
  return {
    hands: [deck.slice(0, 17), deck.slice(17, 34), deck.slice(34, 51)],
    bottom: deck.slice(51)
  };
}

test('游戏列表与元数据覆盖 Phase 2 新玩法', async () => {
  await withServer(async ({ port }) => {
    const baseUrl = `http://127.0.0.1:${port}`;
    const list = await fetch(`${baseUrl}/api/games`).then((res) => res.json());
    assert.strictEqual(list.success, true);
    const ids = list.data.games.map((game) => game.id).sort();
    assert.deepStrictEqual(ids, ['chess', 'chinese_chess', 'doudizhu', 'gomoku', 'texas_holdem']);
    const doudizhu = list.data.games.find((game) => game.id === 'doudizhu');
    assert.strictEqual(doudizhu.minPlayers, 3);
    assert.strictEqual(doudizhu.matchPlayers, 3);
    assert.strictEqual(doudizhu.metadata.deck, 54);

    const meta = await fetch(`${baseUrl}/api/games/doudizhu/meta`).then((res) => res.json());
    assert.strictEqual(meta.success, true);
    assert.strictEqual(meta.data.game.id, 'doudizhu');
    assert.ok(Array.isArray(meta.data.game.seats));
    assert.strictEqual(meta.data.game.seats.length, 3);
    assert.strictEqual(meta.data.game.seats[0].role, 'landlord');
  });
});

test('斗地主实时对局支持出牌/过牌/宣布胜利', async () => {
  await withServer(async ({ port }) => {
    const baseUrl = `http://127.0.0.1:${port}`;
    const tokenA = createToken('player-a');
    const tokenB = createToken('player-b');
    const tokenC = createToken('player-c');

    const startMatch = (token) =>
      fetch(`${baseUrl}/api/match/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ gameId: 'doudizhu' })
      }).then((res) => res.json());

    const ticketA = await startMatch(tokenA);
    assert.strictEqual(ticketA.success, true);
    assert.strictEqual(ticketA.data.ticket.status, 'waiting');

    const ticketB = await startMatch(tokenB);
    assert.strictEqual(ticketB.success, true);
    assert.strictEqual(ticketB.data.ticket.status, 'waiting');

    const ticketC = await startMatch(tokenC);
    assert.strictEqual(ticketC.success, true);
    assert.strictEqual(ticketC.data.ticket.status, 'matched');
    const roomId = ticketC.data.ticket.roomId;
    assert.ok(roomId);

    const fetchRooms = (token) =>
      fetch(`${baseUrl}/api/rooms`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).then((res) => res.json());

    const roomsA = await fetchRooms(tokenA);
    assert.strictEqual(roomsA.data.rooms.length, 1);
    assert.strictEqual(roomsA.data.rooms[0].roomId, roomId);

    const clientA = await connectWebSocket({ port, token: tokenA });
    const clientB = await connectWebSocket({ port, token: tokenB });
    const clientC = await connectWebSocket({ port, token: tokenC });

    clientA.sendJson({ type: 'join_room', roomId });
    clientB.sendJson({ type: 'join_room', roomId });
    clientC.sendJson({ type: 'join_room', roomId });

    await clientA.nextMessage();
    await clientB.nextMessage();
    await clientC.nextMessage();

    clientA.sendJson({ type: 'ready', roomId });
    clientB.sendJson({ type: 'ready', roomId });
    clientC.sendJson({ type: 'ready', roomId });

    const startedA = await waitForType(clientA, 'match_started');
    assert.strictEqual(startedA.payload.gameId, 'doudizhu');
    await waitForType(clientB, 'match_started');
    await waitForType(clientC, 'match_started');

    const firstTurn = await waitForType(clientA, 'turn_started');
    assert.strictEqual(firstTurn.payload.seat, 0);
    await waitForType(clientB, 'turn_started');
    await waitForType(clientC, 'turn_started');

    const { hands } = buildDoudizhuHands();
    const landlordCards = hands[0].slice(0, 3);
    clientA.sendJson({
      type: 'play_action',
      roomId,
      action: {
        type: 'play_cards',
        cards: landlordCards
      }
    });

    const appliedA = await waitForType(clientA, 'action_applied');
    assert.strictEqual(appliedA.payload.action.type, 'play_cards');
    const landlordCount = appliedA.payload.handCounts.find((entry) => entry.seat === 0);
    assert.strictEqual(landlordCount.count, 14);
    await waitForType(clientB, 'action_applied');
    await waitForType(clientC, 'action_applied');

    await waitForType(clientB, 'turn_started');
    await waitForType(clientC, 'turn_started');
    await waitForType(clientA, 'turn_started');

    clientB.sendJson({
      type: 'play_action',
      roomId,
      action: {
        type: 'pass'
      }
    });

    await waitForType(clientA, 'action_applied');
    const passEvent = await waitForType(clientB, 'action_applied');
    assert.strictEqual(passEvent.payload.action.type, 'pass');
    await waitForType(clientC, 'action_applied');

    await waitForType(clientC, 'turn_started');
    await waitForType(clientA, 'turn_started');
    await waitForType(clientB, 'turn_started');

    clientC.sendJson({
      type: 'play_action',
      roomId,
      action: {
        type: 'declare_winner',
        winners: [1, 2],
        reason: 'training_win'
      }
    });

    const resultC = await waitForType(clientC, 'match_result');
    assert.deepStrictEqual(resultC.payload.winnerSeats, [1, 2]);
    await waitForType(clientA, 'match_result');
    await waitForType(clientB, 'match_result');

    clientA.close();
    clientB.close();
    clientC.close();
  });
});
