const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'test-secret';
process.env.TELEGRAM_BOT_TOKEN = '123456:ABCDEF';
process.env.TELEGRAM_LOGIN_TTL = '3600';
process.env.APP_ENV = 'development';
process.env.PORT = '0';

const { withServer, createToken, connectWebSocket, waitForType } = require('../tests/support/server');
const { roomManager } = require('../src/services/roomService');
const progression = require('../src/services/progression');

async function joinRoom(baseUrl, token, payload) {
  const response = await fetch(`${baseUrl}/api/rooms/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

test('私密房支持观战限速与好友/屏蔽社交', () => {
  return withServer(async ({ port }) => {
    const baseUrl = `http://127.0.0.1:${port}`;
    const ownerToken = createToken('owner');
    const guestToken = createToken('guest');
    const spectatorToken = createToken('spectator');
    const spectator2Token = createToken('spectator2');
    const blockedToken = createToken('blocked');

    const createRes = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create',
        gameId: 'gomoku',
        allowSpectators: true,
        spectatorDelayMs: 10,
        spectatorLimit: 1
      })
    }).then((res) => res.json());
    assert.strictEqual(createRes.success, true);
    const createdRoom = createRes.data.room;
    assert.ok(createdRoom.inviteCode);
    const roomId = createdRoom.roomId;
    const inviteCode = createdRoom.inviteCode;

    const guestJoin = await joinRoom(baseUrl, guestToken, { inviteCode });
    assert.strictEqual(guestJoin.success, true);
    assert.strictEqual(guestJoin.data.role, 'player');

    const spectatorJoin = await joinRoom(baseUrl, spectatorToken, { inviteCode, asSpectator: true });
    assert.strictEqual(spectatorJoin.success, true);
    assert.strictEqual(spectatorJoin.data.role, 'spectator');
    assert.strictEqual(spectatorJoin.data.spectator.delayMs, 10);

    const spectatorOverflow = await joinRoom(baseUrl, spectator2Token, { inviteCode, asSpectator: true });
    assert.strictEqual(spectatorOverflow.success, false);
    assert.strictEqual(spectatorOverflow.error.code, 'ROOM_SPECTATORS_LIMIT');

    const ownerWs = await connectWebSocket({ port, token: ownerToken });
    const guestWs = await connectWebSocket({ port, token: guestToken });
    const spectatorWs = await connectWebSocket({ port, token: spectatorToken });

    ownerWs.sendJson({ type: 'join_room', roomId });
    guestWs.sendJson({ type: 'join_room', roomId });
    spectatorWs.sendJson({ type: 'watch_room', roomId, inviteCode });

    const ownerState = await waitForType(ownerWs, 'room_state');
    assert.strictEqual(ownerState.role, 'player');
    const spectatorState = await waitForType(spectatorWs, 'room_state');
    assert.strictEqual(spectatorState.role, 'spectator');
    assert.strictEqual(spectatorState.state.spectatorCount, 1);

    spectatorWs.sendJson({ type: 'ready', roomId });
    const spectatorError = await waitForType(spectatorWs, 'error');
    assert.strictEqual(spectatorError.code, 'ROOM_SPECTATOR_FORBIDDEN');

    ownerWs.sendJson({ type: 'ready', roomId });
    guestWs.sendJson({ type: 'ready', roomId });
    await waitForType(ownerWs, 'match_started');
    await waitForType(guestWs, 'match_started');

    const moves = [
      { player: 'owner', ws: ownerWs, position: { x: 0, y: 0 } },
      { player: 'guest', ws: guestWs, position: { x: 1, y: 0 } },
      { player: 'owner', ws: ownerWs, position: { x: 0, y: 1 } },
      { player: 'guest', ws: guestWs, position: { x: 1, y: 1 } },
      { player: 'owner', ws: ownerWs, position: { x: 0, y: 2 } },
      { player: 'guest', ws: guestWs, position: { x: 1, y: 2 } },
      { player: 'owner', ws: ownerWs, position: { x: 0, y: 3 } },
      { player: 'guest', ws: guestWs, position: { x: 1, y: 3 } },
      { player: 'owner', ws: ownerWs, position: { x: 0, y: 4 } }
    ];

    for (const move of moves) {
      move.ws.sendJson({ type: 'play_action', roomId, action: { position: move.position } });
      const actorEvent = await waitForType(move.ws, 'action_applied');
      assert.strictEqual(actorEvent.payload.playerId, move.player);
      const opponentWs = move.player === 'owner' ? guestWs : ownerWs;
      const opponentEvent = await waitForType(opponentWs, 'action_applied');
      assert.strictEqual(opponentEvent.payload.playerId, move.player);
    }

    const finalRoom = roomManager.getRoom(roomId);
    assert.strictEqual(finalRoom.status, 'finished');
    assert.strictEqual(finalRoom.result.winnerId, 'owner');

    let spectatorResolved = false;
    const spectatorResultPromise = waitForType(spectatorWs, 'match_result').then((message) => {
      spectatorResolved = true;
      return message;
    });
    const [ownerResult, guestResult] = await Promise.all([
      waitForType(ownerWs, 'match_result'),
      waitForType(guestWs, 'match_result')
    ]);
    assert.strictEqual(spectatorResolved, false);
    const spectatorResult = await spectatorResultPromise;

    assert.ok(spectatorResult.sequence >= ownerResult.sequence);
    assert.ok(guestResult.sequence >= ownerResult.sequence);

    ownerWs.close();
    guestWs.close();
    spectatorWs.close();

    await progression.waitForIdle();

    const friendsInitial = await fetch(`${baseUrl}/api/friends`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    }).then((res) => res.json());
    assert.strictEqual(friendsInitial.success, true);
    const recent = friendsInitial.data.recentOpponents.map((entry) => entry.playerId);
    assert.ok(recent.includes('guest'));

    const addFriend = await fetch(`${baseUrl}/api/friends`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'add', playerId: 'guest' })
    }).then((res) => res.json());
    assert.strictEqual(addFriend.success, true);
    assert.ok(addFriend.data.overview.friends.some((entry) => entry.playerId === 'guest'));

    await fetch(`${baseUrl}/api/friends`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'block', playerId: 'blocked' })
    }).then((res) => res.json());

    const blockedJoin = await joinRoom(baseUrl, blockedToken, { inviteCode });
    assert.strictEqual(blockedJoin.success, false);
    assert.strictEqual(blockedJoin.error.code, 'ROOM_PLAYER_BLOCKED');

    const kickRes = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'kick', roomId, targetPlayerId: 'guest' })
    }).then((res) => res.json());
    assert.strictEqual(kickRes.success, true);
    assert.strictEqual(kickRes.data.room.players.length, 1);

    // 清理房间状态，防止对后续测试产生影响
    roomManager.reset();
  });
});
