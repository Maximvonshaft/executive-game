const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'test-secret';
process.env.TELEGRAM_BOT_TOKEN = '123456:ABCDEF';
process.env.TELEGRAM_LOGIN_TTL = '3600';
process.env.APP_ENV = 'development';
process.env.PORT = '0';
process.env.ADMIN_API_KEYS = 'test-admin-key';

const {
  withServer,
  createToken
} = require('../tests/support/server');

function adminHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Key': 'test-admin-key'
  };
}

test('Phase 7 国际化、无障碍与运营后台', async () => {
  await withServer(async ({ port }) => {
    const baseUrl = `http://127.0.0.1:${port}`;
    const bannedToken = createToken('phase7-banned');
    const playerToken = createToken('phase7-player');

    // Ban the player and ensure authenticated requests are rejected.
    let response = await fetch(`${baseUrl}/admin/bans`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ playerId: 'phase7-banned', reason: 'automation', action: 'ban' })
    });
    let payload = await response.json();
    assert.strictEqual(payload.success, true);
    assert.strictEqual(payload.data.result.status, 'banned');

    response = await fetch(`${baseUrl}/api/tasks/today`, {
      headers: {
        Authorization: `Bearer ${bannedToken}`
      }
    });
    payload = await response.json();
    assert.strictEqual(payload.success, false);
    assert.strictEqual(payload.error.code, 'PLAYER_BANNED');

    // Unban and ensure the player regains access with English localisation.
    response = await fetch(`${baseUrl}/admin/bans`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ playerId: 'phase7-banned', action: 'unban' })
    });
    payload = await response.json();
    assert.strictEqual(payload.success, true);
    assert.strictEqual(payload.data.result.status, 'unbanned');

    response = await fetch(`${baseUrl}/api/tasks/today?lang=en`, {
      headers: {
        Authorization: `Bearer ${bannedToken}`
      }
    });
    payload = await response.json();
    assert.strictEqual(payload.success, true);
    const englishTasks = payload.data.tasks;
    assert.ok(Array.isArray(englishTasks));
    assert.ok(englishTasks.length > 0);
    assert.strictEqual(englishTasks[0].titleKey, 'tasks.daily_first_win.title');
    assert.strictEqual(englishTasks[0].title, 'Daily First Win');

    // Update task definitions via admin and verify hot update.
    response = await fetch(`${baseUrl}/admin/tasks`, { headers: adminHeaders() });
    payload = await response.json();
    assert.strictEqual(payload.success, true);
    const updatedDefinitions = payload.data.tasks.definitions.map((definition) => ({ ...definition }));
    updatedDefinitions[0].goal = updatedDefinitions[0].goal + 1;
    updatedDefinitions[0].reward = { coins: 99 };

    response = await fetch(`${baseUrl}/admin/tasks`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ definitions: updatedDefinitions })
    });
    payload = await response.json();
    assert.strictEqual(payload.success, true);

    response = await fetch(`${baseUrl}/api/tasks/today?lang=en`, {
      headers: {
        Authorization: `Bearer ${playerToken}`
      }
    });
    payload = await response.json();
    assert.strictEqual(payload.success, true);
    const refreshedTasks = payload.data.tasks;
    assert.strictEqual(refreshedTasks[0].goal, updatedDefinitions[0].goal);
    assert.strictEqual(refreshedTasks[0].reward.coins, 99);

    // Fetch i18n bundle and update English resources.
    response = await fetch(`${baseUrl}/admin/i18n?lang=en`, { headers: adminHeaders() });
    payload = await response.json();
    assert.strictEqual(payload.success, true);
    const englishResources = payload.data.resources;
    englishResources.tasks.daily_first_win.title = 'Daily First Victory';

    response = await fetch(`${baseUrl}/admin/i18n`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ lang: 'en', resources: englishResources })
    });
    payload = await response.json();
    assert.strictEqual(payload.success, true);

    response = await fetch(`${baseUrl}/api/i18n?lang=en`);
    payload = await response.json();
    assert.strictEqual(payload.success, true);
    assert.strictEqual(
      payload.data.resources.en.tasks.daily_first_win.title,
      'Daily First Victory'
    );

    response = await fetch(`${baseUrl}/api/tasks/today?lang=en`, {
      headers: {
        Authorization: `Bearer ${playerToken}`
      }
    });
    payload = await response.json();
    assert.strictEqual(payload.data.tasks[0].title, 'Daily First Victory');

    // Update banners and verify order and localisation.
    const newBanners = [
      {
        id: 'celebration-week',
        active: true,
        weight: 200,
        titleKey: 'banners.launch_week.title',
        bodyKey: 'banners.launch_week.body',
        defaultTitle: 'Celebration Week',
        defaultBody: 'Double rewards all week long.'
      },
      {
        id: 'secondary-banner',
        active: true,
        weight: 50,
        defaultTitle: 'Secondary Spotlight',
        defaultBody: 'Check out the new challenges.'
      }
    ];
    response = await fetch(`${baseUrl}/admin/banners`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ banners: newBanners })
    });
    payload = await response.json();
    assert.strictEqual(payload.success, true);

    response = await fetch(`${baseUrl}/api/banners?lang=en`);
    payload = await response.json();
    assert.strictEqual(payload.success, true);
    const banners = payload.data.banners;
    assert.ok(Array.isArray(banners));
    assert.ok(banners.length >= 1);
    assert.strictEqual(banners[0].id, 'celebration-week');

    // Update announcement and ensure hot update is reflected on the public API.
    response = await fetch(`${baseUrl}/admin/announcement`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ defaultMessage: 'Maintenance at 22:00 UTC', active: true })
    });
    payload = await response.json();
    assert.strictEqual(payload.success, true);

    response = await fetch(`${baseUrl}/api/announcement?lang=en`);
    payload = await response.json();
    assert.strictEqual(payload.success, true);
    assert.strictEqual(payload.data.announcement.message, 'Maintenance at 22:00 UTC');

    // Update accessibility preferences and verify public endpoint.
    response = await fetch(`${baseUrl}/admin/accessibility`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ minimumContrastRatio: 7, supportsRTL: false })
    });
    payload = await response.json();
    assert.strictEqual(payload.success, true);

    response = await fetch(`${baseUrl}/api/accessibility`);
    payload = await response.json();
    assert.strictEqual(payload.success, true);
    const accessibility = payload.data.accessibility;
    assert.strictEqual(accessibility.settings.minimumContrastRatio, 7);
    assert.strictEqual(accessibility.settings.supportsRTL, false);
  });
});
