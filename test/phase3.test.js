const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'test-secret';
process.env.TELEGRAM_BOT_TOKEN = '123456:ABCDEF';
process.env.TELEGRAM_LOGIN_TTL = '3600';
process.env.APP_ENV = 'development';
process.env.PORT = '0';

const { withServer, createToken } = require('../tests/support/server');
const { roomManager } = require('../src/services/roomService');
const progression = require('../src/services/progression');

function playGomokuMatch(winnerId, loserId) {
  const room = roomManager.createRoom({ gameId: 'gomoku', playerIds: [winnerId, loserId] });
  roomManager.setPlayerReady({ roomId: room.id, playerId: winnerId });
  roomManager.setPlayerReady({ roomId: room.id, playerId: loserId });
  const moves = [
    { player: winnerId, position: { x: 0, y: 0 } },
    { player: loserId, position: { x: 1, y: 0 } },
    { player: winnerId, position: { x: 0, y: 1 } },
    { player: loserId, position: { x: 1, y: 1 } },
    { player: winnerId, position: { x: 0, y: 2 } },
    { player: loserId, position: { x: 1, y: 2 } },
    { player: winnerId, position: { x: 0, y: 3 } },
    { player: loserId, position: { x: 1, y: 3 } },
    { player: winnerId, position: { x: 0, y: 4 } }
  ];
  moves.forEach((move) => {
    roomManager.applyPlayerAction({
      roomId: room.id,
      playerId: move.player,
      action: { position: move.position }
    });
  });
  return room.id;
}

test('对局结算后排行榜、资料卡与任务同步更新', async () => {
  await withServer(async ({ port }) => {
    const baseUrl = `http://127.0.0.1:${port}`;
    playGomokuMatch('alice', 'bob');
    await progression.waitForIdle();

    const leaderboardRes = await fetch(`${baseUrl}/api/leaderboard`).then((res) => res.json());
    assert.strictEqual(leaderboardRes.success, true);
    const entries = leaderboardRes.data.leaderboard.entries;
    assert.ok(entries.length >= 1);
    assert.strictEqual(entries[0].playerId, 'alice');
    assert.ok(entries[0].rating > 1500);

    const weeklyRes = await fetch(`${baseUrl}/api/leaderboard?scope=7d`).then((res) => res.json());
    assert.strictEqual(weeklyRes.data.leaderboard.scope, 'weekly');

    const profileRes = await fetch(`${baseUrl}/api/profile/alice`).then((res) => res.json());
    assert.strictEqual(profileRes.success, true);
    const profile = profileRes.data.profile;
    assert.strictEqual(profile.playerId, 'alice');
    assert.strictEqual(profile.stats.wins, 1);
    assert.strictEqual(profile.history[0].result, 'win');
    assert.ok(profile.shareCard);

    const token = createToken('alice');
    const tasksRes = await fetch(`${baseUrl}/api/tasks/today`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).then((res) => res.json());
    assert.strictEqual(tasksRes.success, true);
    const tasks = tasksRes.data.tasks;
    const winTask = tasks.find((task) => task.id === 'daily_first_win');
    assert.ok(winTask.completed);
    const playTask = tasks.find((task) => task.id === 'daily_play_three');
    assert.strictEqual(playTask.progress, 1);
    const streakTask = tasks.find((task) => task.id === 'daily_back_to_back');
    assert.strictEqual(streakTask.completed, false);

    const claimRes = await fetch(`${baseUrl}/api/tasks/daily_first_win/claim`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).then((res) => res.json());
    assert.strictEqual(claimRes.success, true);
    assert.strictEqual(claimRes.data.claim.taskId, 'daily_first_win');

    await progression.waitForIdle();
    const profileAfterClaim = await fetch(`${baseUrl}/api/profile/alice`).then((res) => res.json());
    assert.strictEqual(profileAfterClaim.data.profile.currencies.coins >= 40, true);
  });
});
