const { createError } = require('../errors/codes');

const SUPPORTED_ENVS = ['development', 'staging', 'production'];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw createError('CONFIG_MISSING_SECRET', { meta: { name } });
  }
  return value;
}

function resolveEnv() {
  const env = (process.env.APP_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  if (!SUPPORTED_ENVS.includes(env)) {
    return 'development';
  }
  return env;
}

function loadConfig() {
  const env = resolveEnv();
  const defaultExpires = env === 'development' ? 60 * 60 * 24 : 60 * 60 * 12; // 1 day dev, 12h others
  const jwtSecret = requireEnv('JWT_SECRET');
  const telegramBotToken = requireEnv('TELEGRAM_BOT_TOKEN');
  const port = Number(process.env.PORT || 3000);
  const loginTtl = Number(process.env.TELEGRAM_LOGIN_TTL || 60 * 60 * 24);
  const adminKeys = (process.env.ADMIN_API_KEYS || 'dev-admin-key')
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
  const configuredLanguages = (process.env.I18N_LANGUAGES || '')
    .split(',')
    .map((lang) => lang.trim())
    .filter((lang) => lang.length > 0);
  const fallbackLanguage = (process.env.I18N_FALLBACK_LANGUAGE || 'zh-CN').trim();

  return {
    env,
    port: Number.isNaN(port) ? 3000 : port,
    securityHeaders: {
      contentSecurityPolicy: "default-src 'self' https://telegram.org https://*.telegram.org; frame-ancestors 'self' https://*.telegram.org",
      permissionsPolicy: "camera=(), microphone=(), geolocation=()"
    },
    jwt: {
      secret: jwtSecret,
      issuer: 'practice-card-games',
      audience: 'telegram-mini-app',
      expiresInSeconds: defaultExpires
    },
    telegram: {
      botToken: telegramBotToken,
      loginTtl
    },
    admin: {
      apiKeys: adminKeys,
      supportedLanguages: configuredLanguages,
      fallbackLanguage: fallbackLanguage || 'zh-CN'
    }
  };
}

const config = loadConfig();

module.exports = {
  config,
  SUPPORTED_ENVS
};
