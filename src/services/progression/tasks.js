const { addCoins, ensureProfile } = require('./playerStore');
const adminConfig = require('../adminConfigService');
const i18n = require('../i18nService');
const { readJson, writeJson, resolveDataPath } = require('../../utils/persistence');

const playerTaskState = new Map();

const TASK_STATE_FILE = resolveDataPath('progression', 'task-state.json');

function hydrateTaskState() {
  const stored = readJson(TASK_STATE_FILE, { players: {} });
  if (!stored || typeof stored.players !== 'object' || stored.players === null) {
    return;
  }
  playerTaskState.clear();
  Object.entries(stored.players).forEach(([playerId, snapshot]) => {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }
    const tasks = new Map();
    if (snapshot.tasks && typeof snapshot.tasks === 'object') {
      Object.entries(snapshot.tasks).forEach(([taskId, entry]) => {
        if (entry && typeof entry === 'object') {
          tasks.set(taskId, { ...entry });
        }
      });
    }
    playerTaskState.set(playerId, {
      date: snapshot.date,
      version: snapshot.version,
      tasks
    });
  });
}

function persistTaskState() {
  const payload = { players: {} };
  playerTaskState.forEach((state, playerId) => {
    const tasks = {};
    state.tasks.forEach((entry, taskId) => {
      tasks[taskId] = { ...entry };
    });
    payload.players[playerId] = {
      date: state.date,
      version: state.version,
      tasks
    };
  });
  writeJson(TASK_STATE_FILE, payload);
}

function getDateKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDate = date.getUTCDate();
  return `${utcYear}-${String(utcMonth + 1).padStart(2, '0')}-${String(utcDate).padStart(2, '0')}`;
}

function createTaskEntry(definition, timestamp) {
  return {
    id: definition.id,
    progress: 0,
    goal: definition.goal,
    completed: false,
    claimed: false,
    updatedAt: timestamp
  };
}

function ensureTaskState(playerId, timestamp = Date.now()) {
  const key = getDateKey(timestamp);
  const version = adminConfig.getTaskConfigVersion();
  let state = playerTaskState.get(playerId);
  const definitions = adminConfig.getTaskDefinitions();
  let mutated = false;
  if (!state || state.date !== key || state.version !== version) {
    state = {
      date: key,
      version,
      tasks: new Map()
    };
    definitions.forEach((definition) => {
      state.tasks.set(definition.id, createTaskEntry(definition, timestamp));
    });
    playerTaskState.set(playerId, state);
    mutated = true;
  } else {
    definitions.forEach((definition) => {
      if (!state.tasks.has(definition.id)) {
        state.tasks.set(definition.id, createTaskEntry(definition, timestamp));
        mutated = true;
      }
    });
  }
  if (mutated) {
    persistTaskState();
  }
  return state;
}

function updateTaskProgress(entry, amount) {
  if (entry.completed || amount <= 0) {
    return false;
  }
  const previous = entry.progress;
  const next = Math.min(entry.goal, entry.progress + amount);
  if (next === previous) {
    return false;
  }
  entry.progress = next;
  entry.updatedAt = Date.now();
  if (entry.progress >= entry.goal) {
    entry.completed = true;
  }
  return true;
}

function fulfillTask(entry) {
  const wasCompleted = entry.completed;
  if (!entry.completed) {
    entry.completed = true;
    entry.progress = entry.goal;
  }
  entry.updatedAt = Date.now();
  return !wasCompleted;
}

function recordMatchProgress({ playerId, result, stats, timestamp }) {
  const state = ensureTaskState(playerId, timestamp);
  const matchesTask = state.tasks.get('daily_play_three');
  let mutated = false;
  if (matchesTask) {
    mutated = updateTaskProgress(matchesTask, 1) || mutated;
  }
  if (result === 'win') {
    const winTask = state.tasks.get('daily_first_win');
    if (winTask) {
      mutated = updateTaskProgress(winTask, 1) || mutated;
    }
  }
  if (stats.winStreak >= 2) {
    const streakTask = state.tasks.get('daily_back_to_back');
    if (streakTask) {
      mutated = fulfillTask(streakTask) || mutated;
    }
  }
  if (mutated) {
    persistTaskState();
  }
}

function resolveTaskText(definition, lang) {
  const title = i18n.translate(lang, definition.titleKey, definition.defaultTitle || definition.title || definition.id);
  const description = i18n.translate(
    lang,
    definition.descriptionKey,
    definition.defaultDescription || definition.description || ''
  );
  return { title, description };
}

function getTasksForPlayer(playerId, timestamp = Date.now(), options = {}) {
  const lang = options.lang || null;
  const state = ensureTaskState(playerId, timestamp);
  const definitions = adminConfig.getTaskDefinitions();
  const [year, month, day] = state.date.split('-').map((part) => Number.parseInt(part, 10));
  const expiry = Date.UTC(year, month - 1, day + 1) - 1;
  return definitions.map((definition) => {
    let entry = state.tasks.get(definition.id);
    if (!entry) {
      entry = createTaskEntry(definition, timestamp);
      state.tasks.set(definition.id, entry);
    }
    const text = resolveTaskText(definition, lang);
    return {
      id: definition.id,
      title: text.title,
      titleKey: definition.titleKey || null,
      description: text.description,
      descriptionKey: definition.descriptionKey || null,
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
  const definition = adminConfig.findTaskDefinition(taskId);
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
  persistTaskState();
  return {
    taskId,
    reward: definition.reward
  };
}

function reset() {
  playerTaskState.clear();
  persistTaskState();
}

module.exports = {
  recordMatchProgress,
  getTasksForPlayer,
  claimTask,
  reset
};

hydrateTaskState();
