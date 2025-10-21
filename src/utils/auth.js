const { createError } = require('../errors/codes');
const { config } = require('../config/env');
const { verifyJwt } = require('./jwt');

function extractToken(header) {
  if (!header) {
    throw createError('AUTH_TOKEN_REQUIRED');
  }
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw createError('AUTH_TOKEN_INVALID');
  }
  return parts[1];
}

function authenticateHttpRequest(req) {
  const token = extractToken(req.headers.authorization);
  try {
    const payload = verifyJwt(token, config.jwt.secret);
    return {
      token,
      payload
    };
  } catch (error) {
    throw createError('AUTH_TOKEN_INVALID', { cause: error });
  }
}

function authenticateToken(token) {
  try {
    const payload = verifyJwt(token, config.jwt.secret);
    return payload;
  } catch (error) {
    throw createError('AUTH_TOKEN_INVALID', { cause: error });
  }
}

module.exports = {
  authenticateHttpRequest,
  authenticateToken
};
