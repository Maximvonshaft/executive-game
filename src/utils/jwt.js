const crypto = require('crypto');
const { createError } = require('../errors/codes');

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad === 0 ? normalized : normalized + '='.repeat(4 - pad);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signJwt(payload, secret, options = {}) {
  if (!secret) {
    throw createError('CONFIG_MISSING_SECRET', { meta: { name: 'JWT_SECRET' } });
  }
  const header = { alg: 'HS256', typ: 'JWT' };
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresInSeconds = options.expiresInSeconds || 3600;
  const body = {
    ...payload,
    aud: options.audience || payload.aud,
    iss: options.issuer || payload.iss,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds
  };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64');
  const encodedSignature = signature
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${data}.${encodedSignature}`;
}

function verifyJwt(token, secret) {
  if (!token) {
    throw new Error('Token required');
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token malformed');
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(encodedSignature);
  if (expectedBuffer.length !== receivedBuffer.length) {
    throw new Error('Signature mismatch');
  }
  if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error('Signature mismatch');
  }
  const payload = JSON.parse(fromBase64Url(encodedPayload));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }
  return payload;
}

module.exports = {
  signJwt,
  verifyJwt
};
