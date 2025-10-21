const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'test-secret';
process.env.TELEGRAM_BOT_TOKEN = '123456:ABCDEF';
process.env.TELEGRAM_LOGIN_TTL = '3600';
process.env.APP_ENV = 'development';
process.env.PORT = '0';

const {
  withServer,
  createToken,
  connectWebSocket,
  waitForType
} = require('../tests/support/server');
const observability = require('../src/services/observability');
const antiCheat = require('../src/services/antiCheatService');

async function createPrivateRoom(baseUrl, token) {
  const response = await fetch(`${baseUrl}/api/rooms`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'create', gameId: 'gomoku', allowSpectators: false })
  });
  return response.json();
}

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

test('Phase 6 anti-cheat,审计与观测能力', async () => {
  await withServer(async ({ port }) => {
    const baseUrl = `http://127.0.0.1:${port}`;
    const ownerToken = createToken('guardian-owner');
    const guestToken = createToken('guardian-guest');

    const createRes = await createPrivateRoom(baseUrl, ownerToken);
    assert.strictEqual(createRes.success, true);
    const roomId = createRes.data.room.roomId;
    const inviteCode = createRes.data.room.inviteCode;
    assert.ok(inviteCode);

    const joinRes = await joinRoom(baseUrl, guestToken, { inviteCode });
    assert.strictEqual(joinRes.success, true);

    const ownerWs = await connectWebSocket({ port, token: ownerToken });
    const guestWs = await connectWebSocket({ port, token: guestToken });

    ownerWs.sendJson({ type: 'join_room', roomId });
    guestWs.sendJson({ type: 'join_room', roomId });

    const ownerState = await waitForType(ownerWs, 'room_state');
    const guestState = await waitForType(guestWs, 'room_state');
    assert.strictEqual(ownerState.role, 'player');
    assert.strictEqual(guestState.role, 'player');

    ownerWs.sendJson({ type: 'ping', clientTimestamp: Date.now() - 5 });
    await waitForType(ownerWs, 'pong');

    ownerWs.sendJson({ type: 'ready', roomId });
    guestWs.sendJson({ type: 'ready', roomId });
    await waitForType(ownerWs, 'match_started');
    await waitForType(guestWs, 'match_started');

    const movePlan = [
      { actor: ownerWs, playerId: 'guardian-owner', frame: 1, key: 'owner-1', position: { x: 7, y: 7 } },
      { actor: guestWs, playerId: 'guardian-guest', frame: 1, key: 'guest-1', position: { x: 8, y: 7 } }
    ];

    for (const move of movePlan) {
      move.actor.sendJson({
        type: 'play_action',
        roomId,
        clientFrame: move.frame,
        idempotencyKey: move.key,
        action: { position: move.position }
      });
      const applied = await waitForType(move.actor, 'action_applied');
      assert.strictEqual(applied.payload.playerId, move.playerId);
      const opponentWs = move.actor === ownerWs ? guestWs : ownerWs;
      const echoed = await waitForType(opponentWs, 'action_applied');
      assert.strictEqual(echoed.payload.playerId, move.playerId);
    }

    ownerWs.sendJson({
      type: 'play_action',
      roomId,
      clientFrame: 1,
      idempotencyKey: 'owner-1',
      action: { position: { x: 7, y: 7 } }
    });
    const duplicateRejectOwner = await waitForType(ownerWs, 'action_rejected');
    assert.strictEqual(duplicateRejectOwner.payload.reason, 'ACTION_DUPLICATE');
    assert.ok(duplicateRejectOwner.payload.fingerprint);
    const duplicateRejectGuest = await waitForType(guestWs, 'action_rejected');
    assert.strictEqual(duplicateRejectGuest.payload.reason, 'ACTION_DUPLICATE');

    ownerWs.sendJson({
      type: 'play_action',
      roomId,
      clientFrame: 2,
      idempotencyKey: 'owner-2',
      action: { position: { x: 7, y: 8 } }
    });
    await waitForType(ownerWs, 'action_applied');
    await waitForType(guestWs, 'action_applied');

    guestWs.sendJson({
      type: 'play_action',
      roomId,
      clientFrame: 3,
      idempotencyKey: 'guest-2',
      action: { position: { x: 9, y: 7 } }
    });
    const outOfSyncOwner = await waitForType(ownerWs, 'action_rejected');
    assert.strictEqual(outOfSyncOwner.payload.reason, 'ACTION_FRAME_OUT_OF_SYNC');
    const outOfSyncGuest = await waitForType(guestWs, 'action_rejected');
    assert.strictEqual(outOfSyncGuest.payload.reason, 'ACTION_FRAME_OUT_OF_SYNC');

    guestWs.sendJson({
      type: 'play_action',
      roomId,
      clientFrame: 2,
      idempotencyKey: 'guest-2',
      action: { position: { x: 8, y: 8 } }
    });
    await waitForType(ownerWs, 'action_applied');
    await waitForType(guestWs, 'action_applied');

    const remainingMoves = [
      { actor: ownerWs, playerId: 'guardian-owner', frame: 3, key: 'owner-3', position: { x: 7, y: 9 } },
      { actor: guestWs, playerId: 'guardian-guest', frame: 3, key: 'guest-3', position: { x: 8, y: 9 } },
      { actor: ownerWs, playerId: 'guardian-owner', frame: 4, key: 'owner-4', position: { x: 7, y: 10 } },
      { actor: guestWs, playerId: 'guardian-guest', frame: 4, key: 'guest-4', position: { x: 8, y: 10 } },
      { actor: ownerWs, playerId: 'guardian-owner', frame: 5, key: 'owner-5', position: { x: 7, y: 11 } }
    ];

    for (const move of remainingMoves) {
      move.actor.sendJson({
        type: 'play_action',
        roomId,
        clientFrame: move.frame,
        idempotencyKey: move.key,
        action: { position: move.position }
      });
      const applied = await waitForType(move.actor, 'action_applied');
      assert.strictEqual(applied.payload.playerId, move.playerId);
      const opponentWs = move.actor === ownerWs ? guestWs : ownerWs;
      const mirrored = await waitForType(opponentWs, 'action_applied');
      assert.strictEqual(mirrored.payload.playerId, move.playerId);
    }

    const ownerResult = await waitForType(ownerWs, 'match_result');
    const guestResult = await waitForType(guestWs, 'match_result');
    assert.strictEqual(ownerResult.payload.winnerId, 'guardian-owner');
    assert.strictEqual(guestResult.payload.winnerId, 'guardian-owner');

    ownerWs.sendJson({ type: 'request_state', roomId, sinceSeq: 0 });
    await waitForType(ownerWs, 'action_applied');

    ownerWs.close();
    guestWs.close();

    const metrics = observability.getMetrics();
    assert.ok(metrics.histograms.match_wait_ms.count >= 1);
    assert.ok(metrics.histograms.match_duration_ms.count >= 1);
    assert.ok(metrics.histograms.ws_latency_ms.count >= 1);
    assert.ok(metrics.histograms.disconnect_recovery_ms.count >= 1);

    const anomalies = antiCheat.listRecent();
    const duplicateAnomaly = anomalies.find((entry) => entry.type === 'idempotency_replay');
    const frameAnomaly = anomalies.find((entry) => entry.type === 'frame_out_of_sync');
    assert.ok(duplicateAnomaly);
    assert.strictEqual(duplicateAnomaly.fingerprint.length, 64);
    assert.ok(frameAnomaly);

    const replayResponse = await fetch(`${baseUrl}/internal/replay/${roomId}`);
    assert.strictEqual(replayResponse.status, 200);
    const replayJson = await replayResponse.json();
    assert.strictEqual(replayJson.success, true);
    const replay = replayJson.data.replay;
    assert.strictEqual(replay.roomId, roomId);
    assert.ok(replay.events.length > 0);
    for (let i = 1; i < replay.events.length; i += 1) {
      assert.strictEqual(replay.events[i].prevHash, replay.events[i - 1].hash);
    }
    assert.strictEqual(replay.integrity.tailHash, replay.events[replay.events.length - 1].hash);
    assert.ok(replay.events.some((event) => event.type === 'action_rejected'));
  });
});
