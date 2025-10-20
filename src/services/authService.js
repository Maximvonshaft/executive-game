const { config } = require('../config/env');
const { signJwt } = require('../utils/jwt');
const { verifyTelegramInitData } = require('../utils/telegram');

function normalizeUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    isBot: Boolean(user.is_bot),
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    username: user.username || '',
    languageCode: user.language_code || '',
    photoUrl: user.photo_url || ''
  };
}

function authenticateWithTelegram(initData) {
  const verification = verifyTelegramInitData(
    initData,
    config.telegram.botToken,
    config.telegram.loginTtl
  );
  const user = normalizeUser(verification.user);
  const payload = {
    sub: user ? String(user.id) : verification.raw.query_id || 'anonymous',
    telegramUserId: user ? String(user.id) : undefined,
    chatType: verification.chatType,
    startParam: verification.startParam
  };
  const token = signJwt(payload, config.jwt.secret, {
    expiresInSeconds: config.jwt.expiresInSeconds,
    audience: config.jwt.audience,
    issuer: config.jwt.issuer
  });
  return {
    token,
    expiresIn: config.jwt.expiresInSeconds,
    user,
    issuedAt: Math.floor(Date.now() / 1000)
  };
}

module.exports = {
  authenticateWithTelegram
};
