const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

process.env.JWT_SECRET = 'test-secret';
process.env.TELEGRAM_BOT_TOKEN = '123456:ABCDEF';
process.env.TELEGRAM_LOGIN_TTL = '3600';
process.env.APP_ENV = 'development';
process.env.PORT = '0';

const { verifyTelegramInitData, buildDataCheckString } = require('../src/utils/telegram');
const { verifyJwt } = require('../src/utils/jwt');
const { authenticateWithTelegram } = require('../src/services/authService');
const { config } = require('../src/config/env');

function createInitData({ user, authDate = Math.floor(Date.now() / 1000), extras = {} }) {
  const params = new URLSearchParams();
  params.set('auth_date', String(authDate));
  if (user) {
    params.set('user', JSON.stringify(user));
  }
  Object.entries(extras).forEach(([key, value]) => {
    params.set(key, value);
  });
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest();
  const dataCheckString = buildDataCheckString(params);
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

test('verifyTelegramInitData succeeds for valid payload', () => {
  const user = {
    id: 42,
    first_name: 'Ada',
    last_name: 'Lovelace',
    username: 'ada',
    language_code: 'en'
  };
  const initData = createInitData({ user });
  const result = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN, config.telegram.loginTtl);
  assert.strictEqual(result.user.id, user.id);
  assert.strictEqual(result.startParam, null);
});

test('verifyTelegramInitData throws on invalid signature', () => {
  const initData = createInitData({ user: { id: 7, first_name: 'Grace' } });
  const tampered = `${initData}&user=%7B%22id%22%3A7%2C%22first_name%22%3A%22Grace%22%2C%22last_name%22%3A%22H%22%7D`;
  assert.throws(() => {
    verifyTelegramInitData(tampered, process.env.TELEGRAM_BOT_TOKEN, config.telegram.loginTtl);
  }, (error) => error.code === 'AUTH_INVALID_SIGNATURE');
});

test('authenticateWithTelegram returns JWT for valid initData', () => {
  const user = {
    id: 99,
    first_name: 'Alan',
    last_name: 'Turing',
    username: 'aturing'
  };
  const initData = createInitData({ user, extras: { start_param: 'lobby' } });
  const session = authenticateWithTelegram(initData);
  assert.ok(session.token);
  const decoded = verifyJwt(session.token, process.env.JWT_SECRET);
  assert.strictEqual(decoded.sub, String(user.id));
  assert.strictEqual(decoded.startParam, 'lobby');
});
