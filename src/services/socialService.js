const MAX_RECENT_OPPONENTS = 20;

const friendMap = new Map(); // playerId -> Set(friendId)
const blockedMap = new Map(); // playerId -> Set(blockedId)
const recentOpponentsMap = new Map(); // playerId -> [ { playerId, lastPlayedAt, gameId, roomId } ]

function ensureSet(store, key) {
  let set = store.get(key);
  if (!set) {
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

function updateRecentOpponents(playerId, opponentId, gameId, roomId, timestamp) {
  if (playerId === opponentId) {
    return;
  }
  const list = recentOpponentsMap.get(playerId) || [];
  const filtered = list.filter((entry) => entry.playerId !== opponentId);
  filtered.unshift({ playerId: opponentId, gameId, roomId, lastPlayedAt: timestamp });
  recentOpponentsMap.set(playerId, filtered.slice(0, MAX_RECENT_OPPONENTS));
}

function recordMatch(room, timestamp = Date.now()) {
  if (!room || !Array.isArray(room.players)) {
    return;
  }
  const playerIds = room.players.map((player) => player.id).filter(Boolean);
  playerIds.forEach((playerId) => {
    playerIds.forEach((opponentId) => {
      if (playerId !== opponentId) {
        updateRecentOpponents(playerId, opponentId, room.gameId, room.id, timestamp);
      }
    });
  });
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
  sourceFriends.add(target);
  targetFriends.add(source);
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
  return { removed: hadFriend };
}

function blockPlayer(playerId, targetId) {
  const source = normalisePlayerId(playerId);
  const target = normalisePlayerId(targetId);
  if (!source || !target || source === target) {
    return { blocked: false };
  }
  const sourceBlocked = ensureSet(blockedMap, source);
  sourceBlocked.add(target);
  const sourceFriends = ensureSet(friendMap, source);
  const targetFriends = ensureSet(friendMap, target);
  sourceFriends.delete(target);
  targetFriends.delete(source);
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
  return { unblocked: hadBlock };
}

function isBlockedBy(playerId, potentialBlockerId) {
  const blocker = normalisePlayerId(potentialBlockerId);
  if (!blocker) {
    return false;
  }
  const blocked = ensureSet(blockedMap, blocker);
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
  const friends = toOverviewList(ensureSet(friendMap, id));
  const blocked = toOverviewList(ensureSet(blockedMap, id));
  const recent = toRecentList(recentOpponentsMap.get(id) || []);
  return { friends, blocked, recentOpponents: recent };
}

function reset() {
  friendMap.clear();
  blockedMap.clear();
  recentOpponentsMap.clear();
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
