const { roomManager } = require('../roomService');
const { createError } = require('../../errors/codes');
const social = require('../socialService');
const {
  ensureProfile,
  processMatchResult,
  getProfileView,
  reset: resetProfiles
} = require('./playerStore');
const { getLeaderboard } = require('./leaderboard');
const tasks = require('./tasks');

let pendingJobs = 0;
const waiters = [];
let listenerAttached = false;

function resolveWaiters() {
  if (pendingJobs === 0) {
    while (waiters.length > 0) {
      const resolver = waiters.shift();
      resolver();
    }
  }
}

function queueJob(fn) {
  pendingJobs += 1;
  setImmediate(() => {
    try {
      fn();
    } finally {
      pendingJobs -= 1;
      resolveWaiters();
    }
  });
}

function determineOutcomes(room) {
  const outcomes = new Map();
  const summary = room.result || {};
  const winnerIds = new Set();
  if (typeof summary.winnerId === 'string') {
    winnerIds.add(summary.winnerId);
  }
  if (Array.isArray(summary.winnerIds)) {
    summary.winnerIds.forEach((id) => {
      if (typeof id === 'string') {
        winnerIds.add(id);
      }
    });
  }
  if (Array.isArray(summary.winnerSeats) && winnerIds.size === 0) {
    summary.winnerSeats.forEach((seat) => {
      const participant = room.players.find((player) => player.seat === seat);
      if (participant) {
        winnerIds.add(participant.id);
      }
    });
  }
  const isDraw = winnerIds.size === 0;
  room.players.forEach((player) => {
    if (isDraw) {
      outcomes.set(player.id, 'draw');
      return;
    }
    outcomes.set(player.id, winnerIds.has(player.id) ? 'win' : 'loss');
  });
  return outcomes;
}

function handleMatchResult(room) {
  const timestamp = Date.now();
  const outcomes = determineOutcomes(room);
  const changes = processMatchResult({ room, outcomes, timestamp });
  changes.forEach((change) => {
    tasks.recordMatchProgress({
      playerId: change.playerId,
      result: change.result,
      stats: change.profile.stats,
      timestamp
    });
  });
  social.recordMatch(room, timestamp);
}

function ensureListener() {
  if (listenerAttached) {
    return;
  }
  listenerAttached = true;
  roomManager.on('event', ({ event, room }) => {
    if (event.type === 'match_result') {
      queueJob(() => handleMatchResult(room));
    }
  });
}

function getProfile(playerId) {
  ensureListener();
  return getProfileView(playerId);
}

function getLeaderboardView(scope, limit) {
  ensureListener();
  return getLeaderboard(scope, limit);
}

function getTodayTasks(playerId) {
  ensureListener();
  ensureProfile(playerId);
  return tasks.getTasksForPlayer(playerId);
}

function claimTaskReward(playerId, taskId) {
  ensureListener();
  try {
    return tasks.claimTask(playerId, taskId);
  } catch (error) {
    if (error && typeof error.code === 'string') {
      throw createError(error.code);
    }
    throw error;
  }
}

function reset() {
  pendingJobs = 0;
  waiters.length = 0;
  resetProfiles();
  tasks.reset();
}

function waitForIdle() {
  ensureListener();
  if (pendingJobs === 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(resolve);
  });
}

module.exports = {
  ensureListener,
  getProfile,
  getLeaderboardView,
  getTodayTasks,
  claimTaskReward,
  reset,
  waitForIdle
};
