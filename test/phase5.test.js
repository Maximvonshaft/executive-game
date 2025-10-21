const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'test-secret';
process.env.TELEGRAM_BOT_TOKEN = '123456:ABCDEF';
process.env.TELEGRAM_LOGIN_TTL = '3600';
process.env.APP_ENV = 'development';
process.env.PORT = '0';

const { withServer, createToken } = require('../tests/support/server');
const progression = require('../src/services/progression');

const PRACTICE_MOVES = [
  { x: 7, y: 7, player: 'black' },
  { x: 8, y: 7, player: 'white' },
  { x: 7, y: 8, player: 'black' },
  { x: 8, y: 8, player: 'white' },
  { x: 7, y: 9, player: 'black' },
  { x: 8, y: 9, player: 'white' },
  { x: 7, y: 10, player: 'black' },
  { x: 9, y: 9, player: 'white' }
];

async function requestSuggestion(baseUrl, token, payload) {
  const response = await fetch(`${baseUrl}/api/ai/suggest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  return { status: response.status, body: json };
}

test('AI 练习模式提供稳定建议、缓存与频控', async () => {
  await withServer(async ({ port }) => {
    const baseUrl = `http://127.0.0.1:${port}`;
    const token = createToken('trainee');

    const firstPayload = {
      gameId: 'gomoku',
      moves: PRACTICE_MOVES,
      limit: 2,
      mode: 'practice'
    };

    const first = await requestSuggestion(baseUrl, token, firstPayload);
    assert.strictEqual(first.status, 200);
    assert.strictEqual(first.body.success, true);
    const suggestion = first.body.data.suggestion;
    assert.ok(Array.isArray(suggestion.recommendedMoves));
    assert.ok(suggestion.recommendedMoves.length >= 1);
    const primary = suggestion.recommendedMoves[0];
    assert.ok(primary.categories.includes('win_now'));
    assert.ok(['H7', 'H12'].includes(primary.coordinate));
    assert.ok(primary.explanation.includes('连成五子'));
    assert.strictEqual(suggestion.cached, false);

    const second = await requestSuggestion(baseUrl, token, firstPayload);
    assert.strictEqual(second.status, 200);
    assert.strictEqual(second.body.success, true);
    assert.strictEqual(second.body.data.suggestion.cached, true);

    const limited = await requestSuggestion(baseUrl, token, {
      ...firstPayload,
      limit: 1
    });
    assert.strictEqual(limited.status, 200);
    assert.strictEqual(limited.body.success, true);
    assert.strictEqual(limited.body.data.suggestion.recommendedMoves.length, 1);

    const throttled = await requestSuggestion(baseUrl, token, firstPayload);
    assert.strictEqual(throttled.status, 429);
    assert.strictEqual(throttled.body.success, false);
    assert.strictEqual(throttled.body.error.code, 'AI_RATE_LIMITED');

    const profile = progression.getProfile('trainee');
    assert.strictEqual(profile.stats.totalMatches, 0);
  });
});
