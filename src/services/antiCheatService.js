const { createHash } = require('crypto');

class AntiCheatService {
  constructor() {
    this.reset();
  }

  reset() {
    this.anomalies = [];
  }

  recordAnomaly({ roomId, playerId, type, details = {}, severity = 'warning' }) {
    const timestamp = Date.now();
    const normalized = JSON.stringify({ roomId, playerId, type, details, severity });
    const fingerprint = createHash('sha256').update(normalized).digest('hex');
    const entry = {
      timestamp,
      roomId,
      playerId,
      type,
      severity,
      details: { ...details },
      fingerprint
    };
    this.anomalies.push(entry);
    return entry;
  }

  listRecent(limit = 50) {
    if (limit <= 0) {
      return [];
    }
    return this.anomalies.slice(-limit);
  }
}

const antiCheatService = new AntiCheatService();

module.exports = antiCheatService;
