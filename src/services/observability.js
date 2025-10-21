const { randomUUID, createHash } = require('crypto');

function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return sorted[0];
  }
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = rank - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function summarizeHistogram(entry) {
  if (!entry || entry.values.length === 0) {
    return { count: 0, sum: 0, average: null, p50: null, p95: null };
  }
  const sum = entry.values.reduce((acc, value) => acc + value, 0);
  const count = entry.values.length;
  return {
    count,
    sum,
    average: sum / count,
    p50: percentile(entry.values, 50),
    p95: percentile(entry.values, 95)
  };
}

class TelemetryService {
  constructor() {
    this.reset();
  }

  reset() {
    this.histograms = new Map();
    this.logs = [];
    this.spans = [];
  }

  recordHistogram(name, value, attributes = {}) {
    if (!Number.isFinite(value)) {
      return;
    }
    const histogram = this.histograms.get(name) || { values: [], attributes: [] };
    histogram.values.push(value);
    histogram.attributes.push({ ...attributes });
    this.histograms.set(name, histogram);
  }

  addLog(level, message, attributes = {}) {
    this.logs.push({
      id: randomUUID(),
      timestamp: Date.now(),
      level,
      message,
      attributes: { ...attributes }
    });
  }

  startSpan(name, attributes = {}) {
    const spanId = randomUUID();
    const startTime = Date.now();
    const span = {
      spanId,
      traceId: createHash('sha1').update(`${spanId}:${startTime}`).digest('hex'),
      name,
      attributes: { ...attributes },
      startTime,
      endTime: null,
      durationMs: null,
      status: 'OK',
      statusMessage: null,
      events: []
    };
    this.spans.push(span);
    return {
      addEvent: (eventName, eventAttributes = {}) => {
        span.events.push({
          name: eventName,
          timestamp: Date.now(),
          attributes: { ...eventAttributes }
        });
      },
      recordException: (error) => {
        const message = error && error.message ? error.message : String(error);
        span.events.push({
          name: 'exception',
          timestamp: Date.now(),
          attributes: { message }
        });
        span.status = 'ERROR';
        span.statusMessage = message;
      },
      end: (options = {}) => {
        if (span.endTime) {
          return;
        }
        span.endTime = Date.now();
        span.durationMs = span.endTime - span.startTime;
        if (options.statusCode) {
          span.status = options.statusCode;
        }
        if (options.message) {
          span.statusMessage = options.message;
        }
      }
    };
  }

  getMetrics() {
    const histograms = {};
    for (const [name, entry] of this.histograms.entries()) {
      histograms[name] = summarizeHistogram(entry);
    }
    return {
      histograms,
      logs: [...this.logs],
      spans: this.spans.map((span) => ({ ...span, events: span.events.map((event) => ({ ...event })) }))
    };
  }
}

const observability = new TelemetryService();

module.exports = observability;
