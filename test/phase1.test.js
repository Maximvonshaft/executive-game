const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const net = require('node:net');
const { once } = require('node:events');

process.env.JWT_SECRET = 'test-secret';
process.env.TELEGRAM_BOT_TOKEN = '123456:ABCDEF';
process.env.TELEGRAM_LOGIN_TTL = '3600';
process.env.APP_ENV = 'development';
process.env.PORT = '0';

const { signJwt } = require('../src/utils/jwt');
const { config } = require('../src/config/env');
const { startServer } = require('../src/server');
const { matchmaker } = require('../src/services/matchService');
const { roomManager } = require('../src/services/roomService');

function createToken(playerId) {
  return signJwt(
    {
      sub: playerId,
      telegramUserId: playerId
    },
    config.jwt.secret,
    {
      audience: config.jwt.audience,
      issuer: config.jwt.issuer,
      expiresInSeconds: 3600
    }
  );
}

function encodeClientFrame(opcode, payloadBuffer) {
  const payload = Buffer.isBuffer(payloadBuffer) ? payloadBuffer : Buffer.from(payloadBuffer);
  const length = payload.length;
  const mask = crypto.randomBytes(4);
  const header = [];
  header.push(0x80 | (opcode & 0x0f));
  if (length < 126) {
    header.push(0x80 | length);
  } else if (length < 65536) {
    header.push(0x80 | 126);
    header.push((length >> 8) & 0xff, length & 0xff);
  } else {
    throw new Error('Payload too large for test helper');
  }
  const headerBuffer = Buffer.from(header);
  const frame = Buffer.concat([headerBuffer, mask, payload]);
  const payloadOffset = headerBuffer.length + 4;
  for (let i = 0; i < payload.length; i += 1) {
    frame[payloadOffset + i] ^= mask[i % 4];
  }
  return frame;
}

function decodeServerFrames(bufferState, incoming) {
  bufferState.buffer = Buffer.concat([bufferState.buffer, incoming]);
  const messages = [];
  while (bufferState.buffer.length >= 2) {
    const firstByte = bufferState.buffer[0];
    const secondByte = bufferState.buffer[1];
    const fin = (firstByte & 0x80) !== 0;
    if (!fin) {
      throw new Error('Fragmented frames not supported in tests');
    }
    const opcode = firstByte & 0x0f;
    let payloadLength = secondByte & 0x7f;
    let offset = 2;
    if (payloadLength === 126) {
      if (bufferState.buffer.length < 4) {
        break;
      }
      payloadLength = bufferState.buffer.readUInt16BE(2);
      offset = 4;
    } else if (payloadLength === 127) {
      throw new Error('Large frames not expected in tests');
    }
    if (bufferState.buffer.length < offset + payloadLength) {
      break;
    }
    const payload = bufferState.buffer.slice(offset, offset + payloadLength);
    bufferState.buffer = bufferState.buffer.slice(offset + payloadLength);
    if (opcode === 0x1) {
      messages.push(payload.toString('utf8'));
    }
  }
  return messages;
}

async function connectWebSocket({ port, token }) {
  const socket = net.createConnection({ port, host: '127.0.0.1' });
  await once(socket, 'connect');
  const key = crypto.randomBytes(16).toString('base64');
  const handshake = [
    `GET /ws?token=${token} HTTP/1.1`,
    `Host: 127.0.0.1:${port}`,
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Key: ${key}`,
    'Sec-WebSocket-Version: 13',
    '\r\n'
  ].join('\r\n');
  socket.write(handshake);
  const bufferState = { buffer: Buffer.alloc(0) };
  let handshakeComplete = false;
  let handshakeResolve;
  let handshakeReject;
  const handshakePromise = new Promise((resolve, reject) => {
    handshakeResolve = resolve;
    handshakeReject = reject;
  });
  const messageQueue = [];
  const waiters = [];

  function flushMessages(messages) {
    messages.forEach((message) => {
      const parsed = JSON.parse(message);
      if (waiters.length > 0) {
        const resolver = waiters.shift();
        resolver(parsed);
      } else {
        messageQueue.push(parsed);
      }
    });
  }

  socket.on('data', (chunk) => {
    if (!handshakeComplete) {
      bufferState.buffer = Buffer.concat([bufferState.buffer, chunk]);
      const idx = bufferState.buffer.indexOf('\r\n\r\n');
      if (idx !== -1) {
        const remaining = bufferState.buffer.slice(idx + 4);
        bufferState.buffer = Buffer.alloc(0);
        handshakeComplete = true;
        handshakeResolve();
        if (remaining.length > 0) {
          const messages = decodeServerFrames(bufferState, remaining);
          flushMessages(messages);
        }
      }
      return;
    }
    const messages = decodeServerFrames(bufferState, chunk);
    flushMessages(messages);
  });

  function sendJson(payload) {
    const frame = encodeClientFrame(0x1, JSON.stringify(payload));
    socket.write(frame);
  }

  function nextMessage() {
    if (messageQueue.length > 0) {
      return Promise.resolve(messageQueue.shift());
    }
    return new Promise((resolve) => {
      waiters.push(resolve);
    });
  }

  function close() {
    if (!socket.destroyed) {
      socket.destroy();
    }
  }

  socket.on('error', (error) => {
    if (!handshakeComplete) {
      handshakeReject(error);
    }
  });

  await handshakePromise;

  return {
    sendJson,
    nextMessage,
    close
  };
}

async function waitForType(client, type) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const message = await client.nextMessage();
    if (message.type === type) {
      return message;
    }
  }
}

async function withServer(testFn) {
  matchmaker.reset();
  roomManager.reset();
  const server = startServer();
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'string' ? config.port : address.port;
  try {
    await testFn({ port });
  } finally {
    if (typeof server.realtimeShutdown === 'function') {
      server.realtimeShutdown();
    }
    server.close();
    await once(server, 'close');
  }
}

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
      actor.sendJson({ type: 'play_action', roomId, position: move.position });
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
