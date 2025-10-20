const { URL } = require('url');
const { createHash } = require('crypto');
const { config } = require('../config/env');
const { verifyJwt } = require('../utils/jwt');
const { ApplicationError } = require('../errors/codes');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class WebSocketGateway {
  constructor({ server, matchService, roomService }) {
    this.server = server;
    this.matchService = matchService;
    this.roomService = roomService;
    this.connections = new Map(); // playerId -> Set<connection>

    this.server.on('upgrade', (request, socket, head) => {
      this.handleUpgrade(request, socket, head).catch(() => {
        socket.destroy();
      });
    });

    this.matchService.on('matchFound', ({ match }) => {
      const room = this.roomService.createMatchRoom(match.gameId, match.playerIds);
      const payload = {
        type: 'match_started',
        data: {
          matchId: match.id,
          roomId: room.id,
          gameId: match.gameId,
          players: room.seats.map((playerId) => ({
            playerId,
            stone: room.stones[playerId]
          }))
        }
      };
      this.broadcastToPlayers(match.playerIds, payload);
    });
  }

  async handleUpgrade(request, socket, head) {
    if (!request.headers.upgrade || request.headers.upgrade.toLowerCase() !== 'websocket') {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      throw new Error('Invalid upgrade header');
    }
    const key = request.headers['sec-websocket-key'];
    if (!key) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      throw new Error('Missing Sec-WebSocket-Key');
    }
    const accept = createHash('sha1').update(`${key}${GUID}`).digest('base64');
    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`
    ];
    const protocol = request.headers['sec-websocket-protocol'];
    if (protocol) {
      headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
    }
    headers.push('\r\n');
    socket.write(headers.join('\r\n'));

    const connection = {
      socket,
      buffer: head && head.length ? Buffer.from(head) : Buffer.alloc(0),
      playerId: null,
      rooms: new Set()
    };

    socket.on('data', (chunk) => {
      connection.buffer = Buffer.concat([connection.buffer, chunk]);
      this.processBuffer(connection).catch((error) => {
        this.safeSend(connection, {
          type: 'action_rejected',
          data: {
            reason: error.code || 'ROOM_ACTION_INVALID',
            message: error.userMessage || error.message || '请求失败'
          }
        });
      });
    });

    socket.on('close', () => {
      this.handleDisconnect(connection);
    });

    socket.on('end', () => {
      this.handleDisconnect(connection);
    });

    socket.on('error', () => {
      this.handleDisconnect(connection);
    });

    await this.establishConnection(connection, request);
    if (connection.buffer.length > 0) {
      this.processBuffer(connection).catch((error) => {
        this.safeSend(connection, {
          type: 'action_rejected',
          data: {
            reason: error.code || 'ROOM_ACTION_INVALID',
            message: error.userMessage || error.message || '请求失败'
          }
        });
      });
    }
  }

  async establishConnection(connection, request) {
    const url = new URL(request.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token) {
      connection.socket.end();
      return;
    }
    let payload;
    try {
      payload = verifyJwt(token, config.jwt.secret);
    } catch (error) {
      connection.socket.end();
      return;
    }
    const playerId = payload.telegramUserId || payload.sub;
    if (!playerId) {
      connection.socket.end();
      return;
    }
    connection.playerId = playerId;
    const list = this.connections.get(playerId) || new Set();
    list.add(connection);
    this.connections.set(playerId, list);
    this.safeSend(connection, {
      type: 'connection_ack',
      data: { playerId }
    });
  }

  async processBuffer(connection) {
    while (connection.buffer.length >= 2) {
      const first = connection.buffer[0];
      const second = connection.buffer[1];
      const fin = (first & 0x80) !== 0;
      const opcode = first & 0x0f;
      const masked = (second & 0x80) !== 0;
      let payloadLength = second & 0x7f;
      let offset = 2;
      if (!masked) {
        throw new Error('Client frames must be masked');
      }
      if (payloadLength === 126) {
        if (connection.buffer.length < offset + 2) {
          return;
        }
        payloadLength = connection.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLength === 127) {
        if (connection.buffer.length < offset + 8) {
          return;
        }
        const high = connection.buffer.readUInt32BE(offset);
        const low = connection.buffer.readUInt32BE(offset + 4);
        payloadLength = high * 2 ** 32 + low;
        offset += 8;
      }
      if (connection.buffer.length < offset + 4 + payloadLength) {
        return;
      }
      const mask = connection.buffer.slice(offset, offset + 4);
      offset += 4;
      const payload = connection.buffer.slice(offset, offset + payloadLength);
      connection.buffer = connection.buffer.slice(offset + payloadLength);
      const unmasked = Buffer.alloc(payloadLength);
      for (let i = 0; i < payloadLength; i += 1) {
        unmasked[i] = payload[i] ^ mask[i % 4];
      }
      if (!fin) {
        continue;
      }
      if (opcode === 0x8) {
        connection.socket.end();
        return;
      }
      if (opcode === 0x9) {
        this.sendFrame(connection.socket, 0xA, unmasked);
        continue;
      }
      if (opcode !== 0x1) {
        continue;
      }
      const message = unmasked.toString('utf8');
      await this.handleMessage(connection, message);
    }
  }

  async handleMessage(connection, raw) {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      throw new ApplicationError('ROOM_ACTION_INVALID', { cause: error });
    }
    const { event, data = {} } = payload;
    switch (event) {
      case 'join_room':
        await this.handleJoinRoom(connection, data);
        break;
      case 'ready':
        await this.handleReady(connection, data);
        break;
      case 'play_action':
        await this.handlePlayAction(connection, data);
        break;
      case 'request_state':
        await this.handleRequestState(connection, data);
        break;
      case 'ping':
        this.safeSend(connection, { type: 'pong', data: { ts: Date.now() } });
        break;
      default:
        throw new ApplicationError('ROOM_ACTION_INVALID');
    }
  }

  handleDisconnect(connection) {
    if (!connection.playerId) {
      return;
    }
    const list = this.connections.get(connection.playerId);
    if (list) {
      list.delete(connection);
      if (list.size === 0) {
        this.connections.delete(connection.playerId);
      }
    }
  }

  async handleJoinRoom(connection, data) {
    const { roomId } = data;
    if (!roomId) {
      throw new ApplicationError('ROOM_NOT_FOUND');
    }
    const state = this.roomService.joinRoom(roomId, connection.playerId);
    connection.rooms.add(roomId);
    this.safeSend(connection, {
      type: 'room_state',
      data: {
        roomId,
        state
      }
    });
  }

  async handleReady(connection, data) {
    const { roomId } = data;
    if (!roomId) {
      throw new ApplicationError('ROOM_NOT_FOUND');
    }
    const { state, started, nextPlayerId } = this.roomService.markReady(roomId, connection.playerId);
    this.broadcastRoom(roomId, {
      type: 'room_state',
      data: {
        roomId,
        state
      }
    });
    if (started && nextPlayerId) {
      this.broadcastRoom(roomId, {
        type: 'turn_started',
        data: {
          roomId,
          playerId: nextPlayerId
        }
      });
    }
  }

  async handlePlayAction(connection, data) {
    const { roomId, x, y } = data;
    if (!roomId || typeof x !== 'number' || typeof y !== 'number') {
      throw new ApplicationError('ROOM_ACTION_INVALID');
    }
    const { state, move, result, nextPlayerId } = this.roomService.applyAction(roomId, connection.playerId, { x, y });
    this.broadcastRoom(roomId, {
      type: 'action_applied',
      data: {
        roomId,
        move,
        sequence: state.sequence,
        engine: state.engine
      }
    });
    if (result) {
      this.broadcastRoom(roomId, {
        type: 'match_result',
        data: {
          roomId,
          result,
          state
        }
      });
    } else if (nextPlayerId) {
      this.broadcastRoom(roomId, {
        type: 'turn_started',
        data: {
          roomId,
          playerId: nextPlayerId
        }
      });
    }
  }

  async handleRequestState(connection, data) {
    const { roomId } = data;
    if (!roomId) {
      throw new ApplicationError('ROOM_NOT_FOUND');
    }
    const room = this.roomService.joinRoom(roomId, connection.playerId);
    this.safeSend(connection, {
      type: 'room_state',
      data: {
        roomId,
        state: room
      }
    });
  }

  broadcastRoom(roomId, message) {
    const room = this.roomService.getRoom(roomId);
    if (!room) {
      return;
    }
    this.broadcastToPlayers(room.seats, message);
  }

  broadcastToPlayers(playerIds, message) {
    const serialized = JSON.stringify(message);
    playerIds.forEach((playerId) => {
      const connections = this.connections.get(playerId);
      if (!connections) {
        return;
      }
      connections.forEach((connection) => {
        this.sendFrame(connection.socket, 0x1, Buffer.from(serialized, 'utf8'));
      });
    });
  }

  safeSend(connection, message) {
    if (!connection.socket.writable) {
      return;
    }
    const serialized = JSON.stringify(message);
    this.sendFrame(connection.socket, 0x1, Buffer.from(serialized, 'utf8'));
  }

  sendFrame(socket, opcode, payload) {
    if (!socket.writable) {
      return;
    }
    const payloadLength = payload.length;
    let headerLength = 2;
    if (payloadLength >= 126 && payloadLength < 65536) {
      headerLength += 2;
    } else if (payloadLength >= 65536) {
      headerLength += 8;
    }
    const buffer = Buffer.alloc(headerLength + payloadLength);
    buffer[0] = 0x80 | (opcode & 0x0f);
    if (payloadLength < 126) {
      buffer[1] = payloadLength;
      payload.copy(buffer, 2);
    } else if (payloadLength < 65536) {
      buffer[1] = 126;
      buffer.writeUInt16BE(payloadLength, 2);
      payload.copy(buffer, 4);
    } else {
      buffer[1] = 127;
      const high = Math.floor(payloadLength / 2 ** 32);
      const low = payloadLength >>> 0;
      buffer.writeUInt32BE(high, 2);
      buffer.writeUInt32BE(low, 6);
      payload.copy(buffer, 10);
    }
    socket.write(buffer);
  }
}

module.exports = {
  WebSocketGateway
};
