const crypto = require('crypto');
const { EventEmitter } = require('events');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function createAcceptKey(key) {
  return crypto
    .createHash('sha1')
    .update(key + GUID)
    .digest('base64');
}

function encodeFrame(opcode, payload) {
  const payloadLength = payload.length;
  let headerLength = 2;
  if (payloadLength >= 126 && payloadLength <= 0xffff) {
    headerLength += 2;
  } else if (payloadLength > 0xffff) {
    headerLength += 8;
  }
  const frame = Buffer.alloc(headerLength + payloadLength);
  frame[0] = 0x80 | (opcode & 0x0f);
  if (payloadLength < 126) {
    frame[1] = payloadLength;
    payload.copy(frame, 2);
  } else if (payloadLength <= 0xffff) {
    frame[1] = 126;
    frame.writeUInt16BE(payloadLength, 2);
    payload.copy(frame, 4);
  } else {
    frame[1] = 127;
    frame.writeBigUInt64BE(BigInt(payloadLength), 2);
    payload.copy(frame, 10);
  }
  return frame;
}

function maskPayload(mask, payload) {
  const length = payload.length;
  const unmasked = Buffer.alloc(length);
  for (let i = 0; i < length; i += 1) {
    unmasked[i] = payload[i] ^ mask[i % 4];
  }
  return unmasked;
}

class SimpleWebSocketConnection extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.alive = true;
    socket.on('data', (chunk) => {
      this.handleData(chunk);
    });
    socket.on('close', () => {
      this.alive = false;
      this.emit('close');
    });
    socket.on('end', () => {
      this.alive = false;
      this.emit('close');
    });
    socket.on('error', (error) => {
      this.emit('error', error);
    });
  }

  handleData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      const firstByte = this.buffer[0];
      const secondByte = this.buffer[1];
      const opcode = firstByte & 0x0f;
      const masked = (secondByte & 0x80) !== 0;
      let payloadLength = secondByte & 0x7f;
      let offset = 2;
      if (payloadLength === 126) {
        if (this.buffer.length < 4) {
          return;
        }
        payloadLength = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (this.buffer.length < 10) {
          return;
        }
        payloadLength = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }
      const maskOffset = offset;
      let mask;
      if (masked) {
        if (this.buffer.length < offset + 4) {
          return;
        }
        mask = this.buffer.slice(maskOffset, maskOffset + 4);
        offset += 4;
      }
      if (this.buffer.length < offset + payloadLength) {
        return;
      }
      const payload = this.buffer.slice(offset, offset + payloadLength);
      this.buffer = this.buffer.slice(offset + payloadLength);
      let data = payload;
      if (masked) {
        data = maskPayload(mask, payload);
      }
      this.processFrame(opcode, data);
    }
  }

  processFrame(opcode, data) {
    switch (opcode) {
      case 0x1: {
        const text = data.toString('utf8');
        this.emit('message', text);
        break;
      }
      case 0x8: {
        this.close();
        break;
      }
      case 0x9: {
        this.sendRaw(0xA, data);
        break;
      }
      case 0xA:
        // pong
        break;
      default:
        // ignore other opcodes
        break;
    }
  }

  sendRaw(opcode, data) {
    if (!this.alive) {
      return;
    }
    const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const frame = encodeFrame(opcode, payload);
    this.socket.write(frame);
  }

  sendText(text) {
    this.sendRaw(0x1, Buffer.from(text, 'utf8'));
  }

  close() {
    if (!this.alive) {
      return;
    }
    this.alive = false;
    this.sendRaw(0x8, Buffer.alloc(0));
    this.socket.end();
  }
}

function createWebSocketServer(server, { onConnection }) {
  server.on('upgrade', (req, socket) => {
    const upgradeHeader = req.headers.upgrade;
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    const acceptKey = createAcceptKey(key);
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`
    ];
    const protocolHeader = req.headers['sec-websocket-protocol'];
    if (protocolHeader) {
      const protocols = protocolHeader.split(',').map((value) => value.trim());
      if (protocols.length > 0) {
        responseHeaders.push(`Sec-WebSocket-Protocol: ${protocols[0]}`);
      }
    }
    responseHeaders.push('\r\n');
    socket.write(responseHeaders.join('\r\n'));
    const connection = new SimpleWebSocketConnection(socket);
    onConnection(connection, req);
  });
}

module.exports = {
  createWebSocketServer,
  SimpleWebSocketConnection
};
