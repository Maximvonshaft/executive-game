const test = require('node:test');
const assert = require('node:assert');
process.env.JWT_SECRET = 'test-secret';
process.env.TELEGRAM_BOT_TOKEN = '123456:ABCDEF';
process.env.TELEGRAM_LOGIN_TTL = '3600';
process.env.APP_ENV = 'development';
process.env.PORT = '0';

const { createToken, connectWebSocket, waitForType, withServer } = require('../tests/support/server');

test('匹配与房间创建流程', async () => {
  await withServer(async ({ port }) => {
    const baseUrl = `http://127.0.0.1:${port}`;
    const tokenA = createToken('player-a');
    const tokenB = createToken('player-b');

    const startA = await fetch(`${baseUrl}/api/match/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ gameId: 'gomoku' })
    }).then((res) => res.json());
    assert.strictEqual(startA.success, true);
    assert.strictEqual(startA.data.ticket.status, 'waiting');

    const startB = await fetch(`${baseUrl}/api/match/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ gameId: 'gomoku' })
    }).then((res) => res.json());
    assert.strictEqual(startB.success, true);
    assert.strictEqual(startB.data.ticket.status, 'matched');
    assert.ok(startB.data.ticket.roomId);

    const roomsA = await fetch(`${baseUrl}/api/rooms`, {
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    }).then((res) => res.json());
    const roomsB = await fetch(`${baseUrl}/api/rooms`, {
      headers: {
        Authorization: `Bearer ${tokenB}`
      }
    }).then((res) => res.json());
    assert.strictEqual(roomsA.data.rooms.length, 1);
    assert.strictEqual(roomsB.data.rooms.length, 1);
    const roomId = roomsA.data.rooms[0].roomId;
    assert.strictEqual(roomId, roomsB.data.rooms[0].roomId);

    const joinA = await fetch(`${baseUrl}/api/rooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ roomId })
    }).then((res) => res.json());
    assert.strictEqual(joinA.data.room.roomId, roomId);
    assert.strictEqual(joinA.data.room.status, 'waiting');

    const clientA = await connectWebSocket({ port, token: tokenA });
    const clientB = await connectWebSocket({ port, token: tokenB });

    clientA.sendJson({ type: 'join_room', roomId });
    clientB.sendJson({ type: 'join_room', roomId });

    const stateA = await clientA.nextMessage();
    assert.strictEqual(stateA.type, 'room_state');
    assert.strictEqual(stateA.state.status, 'waiting');

    const stateB = await clientB.nextMessage();
    assert.strictEqual(stateB.type, 'room_state');
    assert.strictEqual(stateB.state.roomId, roomId);

    clientA.sendJson({ type: 'ready', roomId });
    await waitForType(clientB, 'player_ready');

    clientB.sendJson({ type: 'ready', roomId });
    await waitForType(clientA, 'player_ready');
    const matchStarted = await waitForType(clientA, 'match_started');
    assert.strictEqual(matchStarted.payload.roomId, roomId);
    await waitForType(clientB, 'match_started');
    const firstTurn = await waitForType(clientA, 'turn_started');
    assert.strictEqual(firstTurn.payload.playerId, 'player-a');
    await waitForType(clientB, 'turn_started');

    const moves = [
      { player: clientA, position: { x: 7, y: 7 } },
      { player: clientB, position: { x: 7, y: 8 } },
      { player: clientA, position: { x: 8, y: 7 } },
      { player: clientB, position: { x: 8, y: 8 } },
      { player: clientA, position: { x: 9, y: 7 } },
      { player: clientB, position: { x: 9, y: 8 } },
      { player: clientA, position: { x: 10, y: 7 } },
      { player: clientB, position: { x: 10, y: 8 } },
      { player: clientA, position: { x: 11, y: 7 } }
    ];

    const sequence = moves;
    for (let i = 0; i < sequence.length; i += 1) {
      const move = sequence[i];
      const actor = move.player;
      const opponent = actor === clientA ? clientB : clientA;
      actor.sendJson({ type: 'play_action', roomId, action: { position: move.position } });
      await waitForType(actor, 'action_applied');
      await waitForType(opponent, 'action_applied');
      const isLast = i === sequence.length - 1;
      if (isLast) {
        const resultActor = await waitForType(actor, 'match_result');
        await waitForType(opponent, 'match_result');
        assert.strictEqual(resultActor.payload.winnerId, 'player-a');
        assert.strictEqual(resultActor.payload.reason, 'five_in_a_row');
      } else {
        const nextPlayer = actor === clientA ? clientB : clientA;
        await waitForType(nextPlayer, 'turn_started');
        await waitForType(actor, 'turn_started');
      }
    }

      clientA.close();
      clientB.close();
    });
  });
