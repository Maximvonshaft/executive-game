const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

process.env.JWT_SECRET = 'test-secret';
process.env.TELEGRAM_BOT_TOKEN = '123456:ABCDEF';
process.env.TELEGRAM_LOGIN_TTL = '3600';
process.env.APP_ENV = 'development';
process.env.PORT = '0';

const { withServer } = require('../tests/support/server');

test('服务器可托管 Vite 构建产物并回退到 index.html', async () => {
  const previousStaticRoot = process.env.STATIC_ROOT;
  const distRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'executive-static-'));
  const assetsDir = path.join(distRoot, 'assets');
  await fs.mkdir(assetsDir);

  const htmlTemplate = '<!doctype html><html><body><div id="root">static bundle ready</div><script type="module" src="/assets/main.js"></script></body></html>';
  const assetContent = "console.log('static ok');";

  await fs.writeFile(path.join(distRoot, 'index.html'), htmlTemplate, 'utf8');
  await fs.writeFile(path.join(assetsDir, 'main.js'), assetContent, 'utf8');

  process.env.STATIC_ROOT = distRoot;

  try {
    await withServer(async ({ port }) => {
      const baseUrl = `http://127.0.0.1:${port}`;

      const indexResponse = await fetch(baseUrl);
      assert.strictEqual(indexResponse.status, 200);
      assert.strictEqual(indexResponse.headers.get('content-type'), 'text/html; charset=utf-8');
      assert.strictEqual(indexResponse.headers.get('cache-control'), 'no-store, must-revalidate');
      const indexBody = await indexResponse.text();
      assert.ok(indexBody.includes('static bundle ready'));

      const assetResponse = await fetch(`${baseUrl}/assets/main.js`);
      assert.strictEqual(assetResponse.status, 200);
      assert.strictEqual(assetResponse.headers.get('content-type'), 'application/javascript; charset=utf-8');
      assert.strictEqual(assetResponse.headers.get('cache-control'), 'public, max-age=31536000, immutable');
      const assetBody = await assetResponse.text();
      assert.strictEqual(assetBody, assetContent);

      const spaResponse = await fetch(`${baseUrl}/rooms/private`);
      assert.strictEqual(spaResponse.status, 200);
      const spaBody = await spaResponse.text();
      assert.strictEqual(spaBody, indexBody);
    });
  } finally {
    if (previousStaticRoot === undefined) {
      delete process.env.STATIC_ROOT;
    } else {
      process.env.STATIC_ROOT = previousStaticRoot;
    }
    await fs.rm(distRoot, { recursive: true, force: true });
  }
});
