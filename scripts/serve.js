#!/usr/bin/env node
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve(process.cwd());
const port = Number.parseInt(process.env.PORT ?? '5173', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function safePath(requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  if (!decoded || decoded === '/') {
    return join(root, 'index.html');
  }
  const target = join(root, decoded);
  if (!target.startsWith(root)) {
    return join(root, 'index.html');
  }
  if (existsSync(target) && statSync(target).isDirectory()) {
    return join(target, 'index.html');
  }
  if (existsSync(target)) {
    return target;
  }
  return join(root, 'index.html');
}

const server = createServer((req, res) => {
  const filePath = safePath(req.url ?? '/');
  if (!existsSync(filePath)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  const ext = extname(filePath);
  const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  const stream = createReadStream(filePath);
  stream.on('error', (error) => {
    res.statusCode = 500;
    res.end(error.message);
  });
  stream.pipe(res);
});

server.listen(port, () => {
  console.log(`本地服务器已启动：http://localhost:${port}`);
});
