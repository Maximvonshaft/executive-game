const { createError } = require('../errors/codes');
const { config } = require('../config/env');

function extractAdminKey(req) {
  if (!req || !req.headers) {
    return null;
  }
  if (typeof req.headers['x-admin-key'] === 'string') {
    return req.headers['x-admin-key'].trim();
  }
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : '';
  if (authHeader.startsWith('AdminKey ')) {
    return authHeader.slice('AdminKey '.length).trim();
  }
  if (authHeader.startsWith('Bearer ')) {
    // Allow reuse of Bearer header for admin clients when explicitly configured.
    return authHeader.slice('Bearer '.length).trim();
  }
  return null;
}

function authenticateAdminRequest(req) {
  const key = extractAdminKey(req);
  if (!key) {
    throw createError('ADMIN_KEY_REQUIRED');
  }
  if (!config.admin || !Array.isArray(config.admin.apiKeys) || config.admin.apiKeys.length === 0) {
    throw createError('ADMIN_KEY_INVALID');
  }
  const isValid = config.admin.apiKeys.some((candidate) => candidate && candidate === key);
  if (!isValid) {
    throw createError('ADMIN_KEY_INVALID');
  }
  return { key };
}

module.exports = {
  authenticateAdminRequest
};
