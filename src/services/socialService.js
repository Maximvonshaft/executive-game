const MAX_RECENT_OPPONENTS = 20;

const { readJson, writeJson, resolveDataPath } = require('../utils/persistence');

const RELATIONSHIPS_FILE = resolveDataPath('social', 'relationships.json');

const friendMap = new Map(); // playerId -> Set(friendId)
const blockedMap = new Map(); // playerId -> Set(blockedId)
const recentOpponentsMap = new Map(); // playerId -> [ { playerId, lastPlayedAt, gameId, roomId } ]

function hydrateRelationships() {
  const stored = readJson(RELATIONSHIPS_FILE, {
    friends: {},
    blocked: {},
    recentOpponents: {}
  });
  if (!stored || typeof stored !== 'object') {
    return;
  }
  friendMap.clear();
  blockedMap.clear();
  recentOpponentsMap.clear();
  if (stored.friends && typeof stored.friends === 'object') {
    Object.entries(stored.friends).forEach(([playerId, entries]) => {
      if (Array.isArray(entries)) {
        friendMap.set(playerId, new Set(entries));
      }
    });
  }
  if (stored.blocked && typeof stored.blocked === 'object') {
    Object.entries(stored.blocked).forEach(([playerId, entries]) => {
      if (Array.isArray(entries)) {
        blockedMap.set(playerId, new Set(entries));
      }
    });
  }
  if (stored.recentOpponents && typeof stored.recentOpponents === 'object') {
    Object.entries(stored.recentOpponents).forEach(([playerId, entries]) => {
      if (Array.isArray(entries)) {
        recentOpponentsMap.set(playerId, entries.map((entry) => ({ ...entry })));
      }
    });
  }
}

function persistRelationships() {
  const payload = {
    friends: {},
    blocked: {},
    recentOpponents: {}
  };
  friendMap.forEach((set, playerId) => {
    payload.friends[playerId] = Array.from(set.values());
  });
  blockedMap.forEach((set, playerId) => {
    payload.blocked[playerId] = Array.from(set.values());
  });
  recentOpponentsMap.forEach((entries, playerId) => {
    payload.recentOpponents[playerId] = entries.map((entry) => ({ ...entry }));
  });
  writeJson(RELATIONSHIPS_FILE, payload);
}

function ensureSet(store, key, options = {}) {
  const { createIfMissing = true } = options;
  let set = store.get(key);
  if (!set && createIfMissing) {
    set = new Set();
    store.set(key, set);
  }
  return set;
}

function normalisePlayerId(playerId) {
  if (typeof playerId !== 'string' || playerId.trim() === '') {
    return null;
  }
  return playerId.trim();
}

function toOverviewList(set) {
  return Array.from(set.values()).map((id) => ({ playerId: id }));
}

function toRecentList(list) {
  return list.map((entry) => ({
    playerId: entry.playerId,
    gameId: entry.gameId,
    roomId: entry.roomId,
    lastPlayedAt: entry.lastPlayedAt
  }));
}

function updateRecentOpponents(playerId, opponentId, gameId, roomId, timestamp, options = {}) {
  const { persist = true } = options;
  if (playerId === opponentId) {
    return false;
  }
  const list = recentOpponentsMap.get(playerId) || [];
  const filtered = list.filter((entry) => entry.playerId !== opponentId);
  const nextList = [
    { playerId: opponentId, gameId, roomId, lastPlayedAt: timestamp },
    ...filtered
  ].slice(0, MAX_RECENT_OPPONENTS);
  const before = JSON.stringify(list);
  const after = JSON.stringify(nextList);
  if (before === after) {
    return false;
  }
  recentOpponentsMap.set(playerId, nextList);
  if (persist) {
    persistRelationships();
  }
  return true;
}

function recordMatch(room, timestamp = Date.now()) {
  if (!room || !Array.isArray(room.players)) {
    return;
  }
  const playerIds = room.players.map((player) => player.id).filter(Boolean);
  let mutated = false;
  playerIds.forEach((playerId) => {
    playerIds.forEach((opponentId) => {
      if (playerId !== opponentId) {
        mutated =
          updateRecentOpponents(playerId, opponentId, room.gameId, room.id, timestamp, { persist: false }) || mutated;
      }
    });
  });
  if (mutated) {
    persistRelationships();
  }
}

function addFriend(playerId, targetId) {
  const source = normalisePlayerId(playerId);
  const target = normalisePlayerId(targetId);
  if (!source || !target) {
    return { added: false };
  }
  if (source === target) {
    const error = new Error('Cannot add self as friend');
    error.code = 'FRIEND_SELF_FORBIDDEN';
    throw error;
  }
  const blockedBySource = ensureSet(blockedMap, source);
  const blockedByTarget = ensureSet(blockedMap, target);
  if (blockedBySource.has(target) || blockedByTarget.has(source)) {
    const error = new Error('Player is blocked');
    error.code = 'ROOM_PLAYER_BLOCKED';
    throw error;
  }
  const sourceFriends = ensureSet(friendMap, source);
  const targetFriends = ensureSet(friendMap, target);
  const sizeBeforeSource = sourceFriends.size;
  const sizeBeforeTarget = targetFriends.size;
  sourceFriends.add(target);
  targetFriends.add(source);
  if (sourceFriends.size !== sizeBeforeSource || targetFriends.size !== sizeBeforeTarget) {
    persistRelationships();
  }
  return { added: true };
}

function removeFriend(playerId, targetId) {
  const source = normalisePlayerId(playerId);
  const target = normalisePlayerId(targetId);
  if (!source || !target || source === target) {
    return { removed: false };
  }
  const sourceFriends = ensureSet(friendMap, source);
  const targetFriends = ensureSet(friendMap, target);
  const hadFriend = sourceFriends.delete(target);
  targetFriends.delete(source);
  if (hadFriend) {
    persistRelationships();
  }
  return { removed: hadFriend };
}

function blockPlayer(playerId, targetId) {
  const source = normalisePlayerId(playerId);
  const target = normalisePlayerId(targetId);
  if (!source || !target || source === target) {
    return { blocked: false };
  }
  const sourceBlocked = ensureSet(blockedMap, source);
  const beforeBlocked = sourceBlocked.size;
  sourceBlocked.add(target);
  const sourceFriends = ensureSet(friendMap, source);
  const targetFriends = ensureSet(friendMap, target);
  const removedSource = sourceFriends.delete(target);
  const removedTarget = targetFriends.delete(source);
  if (sourceBlocked.size !== beforeBlocked || removedSource || removedTarget) {
    persistRelationships();
  }
  return { blocked: true };
}

function unblockPlayer(playerId, targetId) {
  const source = normalisePlayerId(playerId);
  const target = normalisePlayerId(targetId);
  if (!source || !target || source === target) {
    return { unblocked: false };
  }
  const sourceBlocked = ensureSet(blockedMap, source);
  const hadBlock = sourceBlocked.delete(target);
  if (hadBlock) {
    persistRelationships();
  }
  return { unblocked: hadBlock };
}

function isBlockedBy(playerId, potentialBlockerId) {
  const blocker = normalisePlayerId(potentialBlockerId);
  if (!blocker) {
    return false;
  }
  const blocked = ensureSet(blockedMap, blocker, { createIfMissing: false });
  if (!blocked) {
    return false;
  }
  return blocked.has(playerId);
}

function isMutuallyBlocked(playerA, playerB) {
  return isBlockedBy(playerA, playerB) || isBlockedBy(playerB, playerA);
}

function getOverview(playerId) {
  const id = normalisePlayerId(playerId);
  if (!id) {
    return {
      friends: [],
      blocked: [],
      recentOpponents: []
    };
  }
  const friendsSet = ensureSet(friendMap, id, { createIfMissing: false });
  const blockedSet = ensureSet(blockedMap, id, { createIfMissing: false });
  const friends = toOverviewList(friendsSet || new Set());
  const blocked = toOverviewList(blockedSet || new Set());
  const recent = toRecentList(recentOpponentsMap.get(id) || []);
  return { friends, blocked, recentOpponents: recent };
}

function reset() {
  friendMap.clear();
  blockedMap.clear();
  recentOpponentsMap.clear();
  persistRelationships();
}

module.exports = {
  addFriend,
  removeFriend,
  blockPlayer,
  unblockPlayer,
  isBlockedBy,
  isMutuallyBlocked,
  getOverview,
  recordMatch,
  updateRecentOpponents,
  reset
};

hydrateRelationships();
