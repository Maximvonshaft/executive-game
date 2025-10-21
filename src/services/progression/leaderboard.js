const DAY_MS = 24 * 60 * 60 * 1000;
const { getAllProfiles } = require('./playerStore');

const SCOPE_ALIASES = new Map([
  ['overall', 'overall'],
  ['all', 'overall'],
  ['7d', 'weekly'],
  ['week', 'weekly'],
  ['weekly', 'weekly'],
  ['30d', 'monthly'],
  ['month', 'monthly'],
  ['monthly', 'monthly']
]);

function normalizeScope(scope = 'overall') {
  const normalized = SCOPE_ALIASES.get(scope) || 'overall';
  return normalized;
}

function getScopeWindow(scope) {
  if (scope === 'weekly') {
    return 7 * DAY_MS;
  }
  if (scope === 'monthly') {
    return 30 * DAY_MS;
  }
  return null;
}

function toWinRate(stats) {
  const total = stats.totalMatches;
  if (total === 0) {
    return 0;
  }
  return Math.round((stats.wins / total) * 1000) / 10;
}

function getLeaderboard(scope = 'overall', limit = 50) {
  const normalized = normalizeScope(scope);
  const window = getScopeWindow(normalized);
  const now = Date.now();
  const resolvedLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50;
  const profiles = getAllProfiles();
  const filtered = profiles.filter((profile) => {
    if (!window) {
      return profile.stats.totalMatches > 0;
    }
    if (!profile.lastActiveAt) {
      return false;
    }
    return now - profile.lastActiveAt <= window;
  });
  filtered.sort((a, b) => {
    if (b.rating === a.rating) {
      return (b.lastActiveAt || 0) - (a.lastActiveAt || 0);
    }
    return b.rating - a.rating;
  });
  const entries = filtered.slice(0, resolvedLimit).map((profile, index) => ({
    rank: index + 1,
    playerId: profile.id,
    rating: Math.round(profile.rating),
    deviation: Math.round(profile.ratingDeviation),
    tier: profile.tier,
    winRate: toWinRate(profile.stats),
    wins: profile.stats.wins,
    losses: profile.stats.losses,
    lastActiveAt: profile.lastActiveAt
  }));
  return {
    scope: normalized,
    generatedAt: now,
    totalPlayers: filtered.length,
    entries
  };
}

module.exports = {
  getLeaderboard
};
