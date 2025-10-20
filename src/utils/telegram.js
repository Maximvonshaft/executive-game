const crypto = require('crypto');
const { createError } = require('../errors/codes');

function buildDataCheckString(params) {
  return Array.from(params.keys())
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${params.get(key)}`)
    .join('\n');
}

function verifyTelegramInitData(initData, botToken, ttlSeconds) {
  if (!initData || typeof initData !== 'string') {
    throw createError('AUTH_INITDATA_REQUIRED');
  }
  let params;
  try {
    params = new URLSearchParams(initData);
  } catch (error) {
    throw createError('AUTH_MALFORMED_INITDATA', { cause: error });
  }
  if (!params.has('hash')) {
    throw createError('AUTH_HASH_MISSING');
  }
  const hash = params.get('hash');
  const dataCheckString = buildDataCheckString(params);
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const expectedBuffer = Buffer.from(computedHash, 'hex');
  const receivedBuffer = Buffer.from(hash, 'hex');
  if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw createError('AUTH_INVALID_SIGNATURE');
  }
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate)) {
    throw createError('AUTH_MALFORMED_INITDATA', { meta: { field: 'auth_date' } });
  }
  const now = Math.floor(Date.now() / 1000);
  if (ttlSeconds > 0 && now - authDate > ttlSeconds) {
    throw createError('AUTH_EXPIRED');
  }
  let user = undefined;
  if (params.has('user')) {
    try {
      user = JSON.parse(params.get('user'));
    } catch (error) {
      throw createError('AUTH_MALFORMED_INITDATA', { cause: error, meta: { field: 'user' } });
    }
  }
  const startParam = params.get('start_param') || null;
  const chatType = params.get('chat_type') || null;
  const raw = Object.fromEntries(params.entries());
  return {
    authDate,
    user,
    startParam,
    chatType,
    raw
  };
}

module.exports = {
  verifyTelegramInitData,
  buildDataCheckString
};
