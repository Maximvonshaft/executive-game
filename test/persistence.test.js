const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');

const persistence = require('../src/utils/persistence');

const baseDir = path.join(os.tmpdir(), 'executive-game-tests', randomUUID());
fs.mkdirSync(baseDir, { recursive: true });
persistence.setDataDir(baseDir);
process.env.DATA_DIR = baseDir;
process.env.I18N_RESOURCES_DIR = path.join(baseDir, 'i18n');

function reload(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('排位资料写入磁盘并可重新加载', () => {
  const store = reload('../src/services/progression/playerStore');
  store.reset();
  store.ensureProfile('persist-player');
  store.addCoins('persist-player', 15);
  const filePath = path.join(baseDir, 'progression', 'profiles.json');
  assert.ok(fs.existsSync(filePath));
  const stored = readJson(filePath);
  const record = stored.profiles.find((entry) => entry.id === 'persist-player');
  assert.ok(record);
  assert.strictEqual(record.currencies.coins, 15);

  const reloaded = reload('../src/services/progression/playerStore');
  const profile = reloaded.getProfileView('persist-player');
  assert.strictEqual(profile.currencies.coins, 15);
});

test('每日任务进度会被持久化', () => {
  reload('../src/services/adminConfigService').reset();
  const tasks = reload('../src/services/progression/tasks');
  tasks.reset();
  const timestamp = Date.now();
  tasks.recordMatchProgress({
    playerId: 'task-player',
    result: 'win',
    stats: { winStreak: 2 },
    timestamp
  });
  const filePath = path.join(baseDir, 'progression', 'task-state.json');
  assert.ok(fs.existsSync(filePath));
  const stored = readJson(filePath);
  assert.ok(stored.players['task-player']);
  const snapshot = stored.players['task-player'];
  assert.strictEqual(snapshot.tasks.daily_first_win.progress, 1);
  assert.strictEqual(snapshot.tasks.daily_play_three.progress, 1);
  assert.strictEqual(snapshot.tasks.daily_back_to_back.completed, true);

  delete require.cache[require.resolve('../src/services/adminConfigService')];
  const reloadedTasks = reload('../src/services/progression/tasks');
  const view = reloadedTasks.getTasksForPlayer('task-player', timestamp, {});
  const wins = view.find((entry) => entry.id === 'daily_first_win');
  assert.strictEqual(wins.progress, 1);
  const streak = view.find((entry) => entry.id === 'daily_back_to_back');
  assert.strictEqual(streak.completed, true);
});

test('社交关系和最近对手列表支持持久化', () => {
  const social = reload('../src/services/socialService');
  social.reset();
  social.addFriend('alice', 'bob');
  social.blockPlayer('alice', 'eve');
  social.recordMatch(
    {
      id: 'room-1',
      gameId: 'gomoku',
      players: [
        { id: 'alice', seat: 0 },
        { id: 'bob', seat: 1 }
      ]
    },
    123456789
  );
  const filePath = path.join(baseDir, 'social', 'relationships.json');
  assert.ok(fs.existsSync(filePath));
  const stored = readJson(filePath);
  assert.deepStrictEqual(stored.friends.alice, ['bob']);
  assert.deepStrictEqual(stored.blocked.alice, ['eve']);
  assert.strictEqual(stored.recentOpponents.alice[0].playerId, 'bob');

  const reloaded = reload('../src/services/socialService');
  const overview = reloaded.getOverview('alice');
  assert.strictEqual(overview.friends.length, 1);
  assert.strictEqual(overview.friends[0].playerId, 'bob');
  assert.strictEqual(overview.blocked[0].playerId, 'eve');
  assert.strictEqual(overview.recentOpponents[0].playerId, 'bob');
});

test('后台配置和封禁名单会持久化', () => {
  const admin = reload('../src/services/adminConfigService');
  admin.reset();
  admin.setTaskDefinitions([
    {
      id: 'daily_custom',
      type: 'daily',
      goal: 2,
      metric: 'wins',
      reward: { coins: 99 },
      titleKey: 'tasks.custom.title',
      descriptionKey: 'tasks.custom.description',
      defaultTitle: '自定义任务',
      defaultDescription: '测试专用任务'
    }
  ]);
  admin.banPlayer('cheater', { reason: 'manual_test' });
  const filePath = path.join(baseDir, 'admin', 'config.json');
  assert.ok(fs.existsSync(filePath));
  const stored = readJson(filePath);
  assert.strictEqual(stored.taskConfig.definitions[0].id, 'daily_custom');
  assert.strictEqual(stored.bannedPlayers[0].playerId, 'cheater');

  delete require.cache[require.resolve('../src/services/adminConfigService')];
  const reloaded = require('../src/services/adminConfigService');
  const ban = reloaded.getBanEntry('cheater');
  assert.ok(ban);
  assert.strictEqual(ban.reason, 'manual_test');
  assert.strictEqual(reloaded.getTaskDefinitions()[0].id, 'daily_custom');
});

test('i18n 自定义语言写入磁盘并可重载', () => {
  const i18n = reload('../src/services/i18nService');
  i18n.reset();
  i18n.updateResources('fr', { greetings: { hello: 'bonjour' } });
  const filePath = path.join(process.env.I18N_RESOURCES_DIR, 'fr.json');
  assert.ok(fs.existsSync(filePath));
  const stored = readJson(filePath);
  assert.strictEqual(stored.greetings.hello, 'bonjour');

  const reloaded = reload('../src/services/i18nService');
  assert.strictEqual(reloaded.translate('fr', 'greetings.hello'), 'bonjour');
});

function loadAiService(options = {}) {
  if (options.maxEntries !== undefined) {
    process.env.AI_CACHE_MAX_ENTRIES = String(options.maxEntries);
  } else {
    delete process.env.AI_CACHE_MAX_ENTRIES;
  }
  if (options.ttlMs !== undefined) {
    process.env.AI_CACHE_TTL_MS = String(options.ttlMs);
  } else {
    delete process.env.AI_CACHE_TTL_MS;
  }
  return reload('../src/services/aiService');
}

test('AI 建议缓存具备 TTL 失效', () => {
  const ai = loadAiService({ maxEntries: 20, ttlMs: 50 });
  ai.reset();
  const baseRequest = {
    playerId: null,
    gameId: 'gomoku',
    moves: [],
    mode: 'analysis'
  };
  const first = ai.getSuggestions({ ...baseRequest, now: 1000 });
  assert.strictEqual(first.cached, false);
  const second = ai.getSuggestions({ ...baseRequest, now: 1010 });
  assert.strictEqual(second.cached, true);
  const expired = ai.getSuggestions({ ...baseRequest, now: 1200 });
  assert.strictEqual(expired.cached, false);
});

function buildMoves(index) {
  const size = 15;
  const x1 = index % size;
  const y1 = Math.floor(index / size) % size;
  let x2 = (x1 + 1 + Math.floor(index / (size * size))) % size;
  let y2 = (y1 + 2 + Math.floor(index / size)) % size;
  if (x2 === x1 && y2 === y1) {
    y2 = (y2 + 1) % size;
  }
  return [
    { x: x1, y: y1, player: 'black' },
    { x: x2, y: y2, player: 'white' }
  ];
}

test('AI 建议缓存按照 LRU 策略淘汰旧条目', () => {
  const ai = loadAiService({ maxEntries: 30, ttlMs: 1000 * 60 });
  ai.reset();
  const limit = ai.getCacheStats().maxEntries;
  for (let i = 0; i < limit + 5; i += 1) {
    ai.getSuggestions({
      playerId: null,
      gameId: 'gomoku',
      moves: buildMoves(i),
      mode: 'practice',
      now: 1
    });
  }
  const stats = ai.getCacheStats();
  assert.ok(stats.size <= stats.maxEntries);

  const fresh = ai.getSuggestions({
    playerId: null,
    gameId: 'gomoku',
    moves: buildMoves(0),
    mode: 'practice',
    now: 2
  });
  assert.strictEqual(fresh.cached, false);
  const cachedAgain = ai.getSuggestions({
    playerId: null,
    gameId: 'gomoku',
    moves: buildMoves(0),
    mode: 'practice',
    now: 3
  });
  assert.strictEqual(cachedAgain.cached, true);
});
