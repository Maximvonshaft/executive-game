const http = require('http');
const { URL } = require('url');
const { config } = require('./config/env');
const { ApplicationError, ERROR_CODES } = require('./errors/codes');
const { authenticateWithTelegram } = require('./services/authService');

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', config.securityHeaders.contentSecurityPolicy);
  res.setHeader('Permissions-Policy', config.securityHeaders.permissionsPolicy);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const json = JSON.parse(raw);
        resolve(json);
      } catch (error) {
        reject(new ApplicationError('AUTH_MALFORMED_INITDATA', { cause: error }));
      }
    });
    req.on('error', (error) => {
      reject(error);
    });
  });
}

function handleError(error, res) {
  const isAppError = error instanceof ApplicationError;
  const definition = isAppError ? error : new ApplicationError('SERVER_ERROR', { cause: error });
  const payload = {
    success: false,
    error: {
      code: definition.code,
      message: definition.userMessage,
      details: definition.meta || null
    }
  };
  res.statusCode = definition.httpStatus || ERROR_CODES.SERVER_ERROR.httpStatus;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function requestHandler(req, res) {
  setSecurityHeaders(res);
  const origin = req.headers.host ? `http://${req.headers.host}` : 'http://localhost';
  const url = new URL(req.url, origin);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/healthz') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', env: config.env }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/telegram') {
    try {
      const body = await parseBody(req);
      const initData = body.initData;
      if (typeof initData !== 'string') {
        throw new ApplicationError('AUTH_INITDATA_REQUIRED');
      }
      const session = authenticateWithTelegram(initData);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, data: session }));
    } catch (error) {
      handleError(error, res);
    }
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: '资源不存在' } }));
}

function startServer() {
  const server = http.createServer((req, res) => {
    requestHandler(req, res).catch((error) => {
      handleError(error, res);
    });
  });
  server.listen(config.port, () => {
    process.stdout.write(`Server listening on port ${config.port} (env: ${config.env})\n`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer
};
