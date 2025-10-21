const crypto = require('node:crypto');
const net = require('node:net');
const { once } = require('node:events');

const { signJwt } = require('../../src/utils/jwt');
const { config } = require('../../src/config/env');
const { startServer } = require('../../src/server');
const { matchmaker } = require('../../src/services/matchService');
const { roomManager } = require('../../src/services/roomService');

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
  const messageQueue = [];
  const waiters = [];

  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.on('data', function handle(data) {
      if (!handshakeComplete) {
        bufferState.buffer = Buffer.concat([bufferState.buffer, data]);
        const idx = bufferState.buffer.indexOf('\r\n\r\n');
        if (idx !== -1) {
          const remaining = bufferState.buffer.slice(idx + 4);
          bufferState.buffer = Buffer.alloc(0);
          handshakeComplete = true;
          socket.off('error', reject);
          socket.on('data', (chunk) => {
            const messages = decodeServerFrames(bufferState, chunk);
            messages.forEach((message) => {
              const parsed = JSON.parse(message);
              if (waiters.length > 0) {
                const resolver = waiters.shift();
                resolver(parsed);
              } else {
                messageQueue.push(parsed);
              }
            });
          });
          if (remaining.length > 0) {
            const messages = decodeServerFrames(bufferState, remaining);
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
          resolve();
        }
      }
    });
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

  return { sendJson, nextMessage, close };
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

module.exports = {
  createToken,
  connectWebSocket,
  waitForType,
  withServer,
  config
};
