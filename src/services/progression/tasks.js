const { addCoins, ensureProfile } = require('./playerStore');

const TASK_DEFINITIONS = [
  {
    id: 'daily_first_win',
    title: '每日首胜',
    description: '赢下一场排位赛，领取额外奖励。',
    type: 'daily',
    goal: 1,
    metric: 'wins',
    reward: { coins: 40 }
  },
  {
    id: 'daily_play_three',
    title: '三局热身',
    description: '完成 3 场任意排位赛，保持手感。',
    type: 'daily',
    goal: 3,
    metric: 'matches',
    reward: { coins: 25 }
  },
  {
    id: 'daily_back_to_back',
    title: '连胜节奏',
    description: '达成 2 连胜，保持势头不减。',
    type: 'daily',
    goal: 1,
    metric: 'streak',
    reward: { coins: 30 }
  }
];

const playerTaskState = new Map();

function getDateKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDate = date.getUTCDate();
  return `${utcYear}-${String(utcMonth + 1).padStart(2, '0')}-${String(utcDate).padStart(2, '0')}`;
}

function ensureTaskState(playerId, timestamp = Date.now()) {
  const key = getDateKey(timestamp);
  let state = playerTaskState.get(playerId);
  if (!state || state.date !== key) {
    state = {
      date: key,
      tasks: new Map()
    };
    TASK_DEFINITIONS.forEach((definition) => {
      state.tasks.set(definition.id, {
        id: definition.id,
        progress: 0,
        goal: definition.goal,
        completed: false,
        claimed: false,
        updatedAt: timestamp
      });
    });
    playerTaskState.set(playerId, state);
  }
  return state;
}

function updateTaskProgress(entry, amount) {
  if (entry.completed) {
    return;
  }
  entry.progress = Math.min(entry.goal, entry.progress + amount);
  entry.updatedAt = Date.now();
  if (entry.progress >= entry.goal) {
    entry.completed = true;
  }
}

function fulfillTask(entry) {
  if (!entry.completed) {
    entry.completed = true;
    entry.progress = entry.goal;
  }
  entry.updatedAt = Date.now();
}

function recordMatchProgress({ playerId, result, stats, timestamp }) {
  const state = ensureTaskState(playerId, timestamp);
  const matchesTask = state.tasks.get('daily_play_three');
  if (matchesTask) {
    updateTaskProgress(matchesTask, 1);
  }
  if (result === 'win') {
    const winTask = state.tasks.get('daily_first_win');
    if (winTask) {
      updateTaskProgress(winTask, 1);
    }
  }
  if (stats.winStreak >= 2) {
    const streakTask = state.tasks.get('daily_back_to_back');
    if (streakTask) {
      fulfillTask(streakTask);
    }
  }
}

function getTasksForPlayer(playerId, timestamp = Date.now()) {
  const state = ensureTaskState(playerId, timestamp);
  const [year, month, day] = state.date.split('-').map((part) => Number.parseInt(part, 10));
  const expiry = Date.UTC(year, month - 1, day + 1) - 1;
  return TASK_DEFINITIONS.map((definition) => {
    const entry = state.tasks.get(definition.id);
    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      type: definition.type,
      progress: entry.progress,
      goal: entry.goal,
      completed: entry.completed,
      claimed: entry.claimed,
      reward: definition.reward,
      updatedAt: entry.updatedAt,
      expiresAt: expiry
    };
  });
}

function claimTask(playerId, taskId, timestamp = Date.now()) {
  const definition = TASK_DEFINITIONS.find((task) => task.id === taskId);
  if (!definition) {
    const error = new Error('TASK_NOT_FOUND');
    error.code = 'TASK_NOT_FOUND';
    throw error;
  }
  const state = ensureTaskState(playerId, timestamp);
  const entry = state.tasks.get(taskId);
  if (!entry) {
    const error = new Error('TASK_NOT_AVAILABLE');
    error.code = 'TASK_NOT_AVAILABLE';
    throw error;
  }
  if (!entry.completed) {
    const error = new Error('TASK_NOT_COMPLETED');
    error.code = 'TASK_NOT_COMPLETED';
    throw error;
  }
  if (entry.claimed) {
    const error = new Error('TASK_ALREADY_CLAIMED');
    error.code = 'TASK_ALREADY_CLAIMED';
    throw error;
  }
  entry.claimed = true;
  entry.updatedAt = timestamp;
  if (definition.reward && typeof definition.reward.coins === 'number') {
    addCoins(playerId, definition.reward.coins);
  }
  ensureProfile(playerId);
  return {
    taskId,
    reward: definition.reward
  };
}

function reset() {
  playerTaskState.clear();
}

module.exports = {
  recordMatchProgress,
  getTasksForPlayer,
  claimTask,
  reset
};
