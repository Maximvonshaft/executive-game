const { createHash } = require('crypto');

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

class AuditService {
  constructor() {
    this.reset();
  }

  reset() {
    this.replays = new Map();
  }

  registerRoom(room) {
    if (!room || !room.id) {
      return;
    }
    if (this.replays.has(room.id)) {
      return;
    }
    const base = {
      roomId: room.id,
      gameId: room.gameId,
      createdAt: room.createdAt,
      ownerId: room.ownerId || null,
      visibility: room.visibility,
      players: room.players.map((player) => ({
        id: player.id,
        seat: player.seat,
        attributes: player.attributes ? { ...player.attributes } : {}
      })),
      events: [],
      finalResult: null,
      completedAt: null,
      tailHash: '0'
    };
    this.replays.set(room.id, base);
  }

  appendEvent({ room, event }) {
    if (!room || !event) {
      return;
    }
    this.registerRoom(room);
    const replay = this.replays.get(room.id);
    if (!replay) {
      return;
    }
    const prevHash = replay.events.length > 0 ? replay.events[replay.events.length - 1].hash : '0';
    const serialized = JSON.stringify({
      sequence: event.sequence,
      type: event.type,
      payload: event.payload,
      timestamp: event.timestamp,
      prevHash
    });
    const hash = createHash('sha256').update(serialized).digest('hex');
    const recorded = {
      sequence: event.sequence,
      type: event.type,
      payload: deepClone(event.payload),
      timestamp: event.timestamp,
      prevHash,
      hash
    };
    replay.events.push(recorded);
    replay.tailHash = hash;
    replay.finalResult = room.result ? deepClone(room.result) : replay.finalResult;
    if (room.status === 'finished') {
      replay.completedAt = room.updatedAt || event.timestamp;
    }
  }

  getReplay(roomId) {
    const replay = this.replays.get(roomId);
    if (!replay) {
      return null;
    }
    return {
      roomId: replay.roomId,
      gameId: replay.gameId,
      createdAt: replay.createdAt,
      completedAt: replay.completedAt,
      ownerId: replay.ownerId,
      visibility: replay.visibility,
      players: replay.players.map((player) => ({
        ...player,
        attributes: player.attributes ? { ...player.attributes } : {}
      })),
      finalResult: replay.finalResult ? deepClone(replay.finalResult) : null,
      integrity: {
        tailHash: replay.tailHash,
        eventCount: replay.events.length
      },
      events: replay.events.map((event) => ({ ...event, payload: deepClone(event.payload) }))
    };
  }
}

const auditService = new AuditService();

module.exports = auditService;
