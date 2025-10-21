const { translate } = require('./i18nService');

const DEFAULT_TASK_DEFINITIONS = [
  {
    id: 'daily_first_win',
    type: 'daily',
    goal: 1,
    metric: 'wins',
    reward: { coins: 40 },
    titleKey: 'tasks.daily_first_win.title',
    descriptionKey: 'tasks.daily_first_win.description',
    defaultTitle: '每日首胜',
    defaultDescription: '赢下一场排位赛，领取额外奖励。'
  },
  {
    id: 'daily_play_three',
    type: 'daily',
    goal: 3,
    metric: 'matches',
    reward: { coins: 25 },
    titleKey: 'tasks.daily_play_three.title',
    descriptionKey: 'tasks.daily_play_three.description',
    defaultTitle: '三局热身',
    defaultDescription: '完成 3 场任意排位赛，保持手感。'
  },
  {
    id: 'daily_back_to_back',
    type: 'daily',
    goal: 1,
    metric: 'streak',
    reward: { coins: 30 },
    titleKey: 'tasks.daily_back_to_back.title',
    descriptionKey: 'tasks.daily_back_to_back.description',
    defaultTitle: '连胜节奏',
    defaultDescription: '达成 2 连胜，保持势头不减。'
  }
];

const DEFAULT_BANNERS = [
  {
    id: 'launch_week',
    active: true,
    weight: 100,
    titleKey: 'banners.launch_week.title',
    bodyKey: 'banners.launch_week.body',
    defaultTitle: '开服冲刺福利',
    defaultBody: '完成每日任务，领取限定头像框。',
    imageUrl: 'https://cdn.practice-card.games/banners/launch-week.png',
    actionUrl: 'https://t.me/practice-card-games',
    tags: ['featured']
  }
];

const DEFAULT_ANNOUNCEMENT = {
  id: 'global',
  level: 'info',
  active: true,
  messageKey: 'announcements.global.message',
  defaultMessage: '欢迎来到 Practice Card Games！祝你好运。'
};

const DEFAULT_ACCESSIBILITY = {
  minimumContrastRatio: 4.5,
  supportsHighContrastMode: true,
  dynamicTextScale: true,
  prefersReducedMotion: true,
  supportsRTL: true
};

let taskConfig = {
  version: Date.now(),
  updatedAt: Date.now(),
  definitions: DEFAULT_TASK_DEFINITIONS
};

let bannerConfig = {
  version: Date.now(),
  updatedAt: Date.now(),
  items: DEFAULT_BANNERS
};

let announcementConfig = {
  version: Date.now(),
  updatedAt: Date.now(),
  announcement: DEFAULT_ANNOUNCEMENT
};

let accessibilityConfig = {
  version: Date.now(),
  updatedAt: Date.now(),
  settings: DEFAULT_ACCESSIBILITY
};

const bannedPlayers = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function raise(code, meta) {
  const error = new Error(code);
  error.code = code;
  if (meta) {
    error.meta = meta;
  }
  throw error;
}

function bumpConfig(configRef) {
  const now = Date.now();
  const version = now > configRef.version ? now : configRef.version + 1;
  configRef.version = version;
  configRef.updatedAt = now;
}

function normaliseTaskDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    raise('ADMIN_PAYLOAD_INVALID', { reason: 'TASK_DEFINITION_INVALID' });
  }
  const id = typeof definition.id === 'string' ? definition.id.trim() : '';
  if (!id) {
    raise('ADMIN_PAYLOAD_INVALID', { reason: 'TASK_ID_REQUIRED' });
  }
  const goalNumeric = Number.parseInt(definition.goal, 10);
  const goal = Number.isFinite(goalNumeric) && goalNumeric > 0 ? goalNumeric : 1;
  const type = typeof definition.type === 'string' && definition.type.trim() ? definition.type.trim() : 'daily';
  const metric = typeof definition.metric === 'string' && definition.metric.trim() ? definition.metric.trim() : 'matches';
  const reward = definition.reward && typeof definition.reward === 'object' ? clone(definition.reward) : {};
  const titleKey = typeof definition.titleKey === 'string' && definition.titleKey.trim() ? definition.titleKey.trim() : null;
  const descriptionKey =
    typeof definition.descriptionKey === 'string' && definition.descriptionKey.trim()
      ? definition.descriptionKey.trim()
      : null;
  const defaultTitle = typeof definition.defaultTitle === 'string' ? definition.defaultTitle : null;
  const defaultDescription = typeof definition.defaultDescription === 'string' ? definition.defaultDescription : null;
  return {
    id,
    type,
    goal,
    metric,
    reward,
    titleKey,
    descriptionKey,
    defaultTitle,
    defaultDescription
  };
}

function setTaskDefinitions(definitions) {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    raise('ADMIN_PAYLOAD_INVALID', { reason: 'TASK_DEFINITION_REQUIRED' });
  }
  const normalised = definitions.map(normaliseTaskDefinition);
  taskConfig = {
    ...taskConfig,
    definitions: normalised
  };
  bumpConfig(taskConfig);
}

function getTaskDefinitions() {
  return clone(taskConfig.definitions);
}

function getTaskConfig() {
  return {
    version: taskConfig.version,
    updatedAt: taskConfig.updatedAt,
    definitions: getTaskDefinitions()
  };
}

function getTaskConfigVersion() {
  return taskConfig.version;
}

function findTaskDefinition(taskId) {
  return taskConfig.definitions.find((definition) => definition.id === taskId) || null;
}

function normaliseBanner(banner) {
  if (!banner || typeof banner !== 'object') {
    raise('ADMIN_PAYLOAD_INVALID', { reason: 'BANNER_INVALID' });
  }
  const id = typeof banner.id === 'string' ? banner.id.trim() : '';
  if (!id) {
    raise('ADMIN_PAYLOAD_INVALID', { reason: 'BANNER_ID_REQUIRED' });
  }
  const titleKey = typeof banner.titleKey === 'string' && banner.titleKey.trim() ? banner.titleKey.trim() : null;
  const bodyKey = typeof banner.bodyKey === 'string' && banner.bodyKey.trim() ? banner.bodyKey.trim() : null;
  const defaultTitle = typeof banner.defaultTitle === 'string' ? banner.defaultTitle : null;
  const defaultBody = typeof banner.defaultBody === 'string' ? banner.defaultBody : null;
  const imageUrl = typeof banner.imageUrl === 'string' ? banner.imageUrl : null;
  const actionUrl = typeof banner.actionUrl === 'string' ? banner.actionUrl : null;
  const active = banner.active !== false;
  const weight = Number.isFinite(Number(banner.weight)) ? Number(banner.weight) : 100;
  const activeFrom = banner.activeFrom ? Number(new Date(banner.activeFrom).getTime()) : null;
  const activeTo = banner.activeTo ? Number(new Date(banner.activeTo).getTime()) : null;
  const tags = Array.isArray(banner.tags) ? banner.tags.filter((tag) => typeof tag === 'string') : [];
  return {
    id,
    titleKey,
    bodyKey,
    defaultTitle,
    defaultBody,
    imageUrl,
    actionUrl,
    active,
    weight,
    activeFrom: Number.isFinite(activeFrom) ? activeFrom : null,
    activeTo: Number.isFinite(activeTo) ? activeTo : null,
    tags
  };
}

function setBanners(banners) {
  if (!Array.isArray(banners)) {
    raise('ADMIN_PAYLOAD_INVALID', { reason: 'BANNER_LIST_REQUIRED' });
  }
  const normalised = banners.map(normaliseBanner);
  bannerConfig = {
    ...bannerConfig,
    items: normalised
  };
  bumpConfig(bannerConfig);
}

function getBanners() {
  return {
    version: bannerConfig.version,
    updatedAt: bannerConfig.updatedAt,
    items: clone(bannerConfig.items)
  };
}

function resolveBannerView(banner, lang) {
  return {
    id: banner.id,
    title: translate(lang, banner.titleKey, banner.defaultTitle),
    titleKey: banner.titleKey,
    body: translate(lang, banner.bodyKey, banner.defaultBody),
    bodyKey: banner.bodyKey,
    imageUrl: banner.imageUrl,
    actionUrl: banner.actionUrl,
    weight: banner.weight,
    activeFrom: banner.activeFrom,
    activeTo: banner.activeTo,
    tags: banner.tags
  };
}

function getActiveBanners(now = Date.now(), options = {}) {
  const lang = options.lang || null;
  return bannerConfig.items
    .filter((banner) => {
      if (!banner.active) {
        return false;
      }
      if (Number.isFinite(banner.activeFrom) && banner.activeFrom > now) {
        return false;
      }
      if (Number.isFinite(banner.activeTo) && banner.activeTo < now) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.weight - a.weight)
    .map((banner) => resolveBannerView(banner, lang));
}

function normaliseAnnouncement(update) {
  if (!update || typeof update !== 'object') {
    raise('ADMIN_PAYLOAD_INVALID', { reason: 'ANNOUNCEMENT_INVALID' });
  }
  const id = typeof update.id === 'string' && update.id.trim() ? update.id.trim() : announcementConfig.announcement.id;
  const level = typeof update.level === 'string' && update.level.trim() ? update.level.trim() : 'info';
  const messageKey = typeof update.messageKey === 'string' && update.messageKey.trim() ? update.messageKey.trim() : null;
  const defaultMessage =
    typeof update.defaultMessage === 'string' ? update.defaultMessage : announcementConfig.announcement.defaultMessage;
  const active = update.active !== false;
  const activeFrom = update.activeFrom ? Number(new Date(update.activeFrom).getTime()) : null;
  const activeTo = update.activeTo ? Number(new Date(update.activeTo).getTime()) : null;
  return {
    id,
    level,
    messageKey,
    defaultMessage,
    active,
    activeFrom: Number.isFinite(activeFrom) ? activeFrom : null,
    activeTo: Number.isFinite(activeTo) ? activeTo : null
  };
}

function updateAnnouncement(update) {
  const announcement = normaliseAnnouncement(update);
  announcementConfig = {
    ...announcementConfig,
    announcement
  };
  bumpConfig(announcementConfig);
}

function getAnnouncement() {
  return {
    version: announcementConfig.version,
    updatedAt: announcementConfig.updatedAt,
    announcement: clone(announcementConfig.announcement)
  };
}

function getActiveAnnouncement(now = Date.now(), options = {}) {
  const lang = options.lang || null;
  const announcement = announcementConfig.announcement;
  if (!announcement.active) {
    return null;
  }
  if (Number.isFinite(announcement.activeFrom) && announcement.activeFrom > now) {
    return null;
  }
  if (Number.isFinite(announcement.activeTo) && announcement.activeTo < now) {
    return null;
  }
  return {
    id: announcement.id,
    level: announcement.level,
    messageKey: announcement.messageKey,
    message: translate(lang, announcement.messageKey, announcement.defaultMessage),
    defaultMessage: announcement.defaultMessage,
    activeFrom: announcement.activeFrom,
    activeTo: announcement.activeTo
  };
}

function getAccessibilitySettings() {
  return {
    version: accessibilityConfig.version,
    updatedAt: accessibilityConfig.updatedAt,
    settings: clone(accessibilityConfig.settings)
  };
}

function updateAccessibilitySettings(settings) {
  if (!settings || typeof settings !== 'object') {
    raise('ADMIN_PAYLOAD_INVALID', { reason: 'ACCESSIBILITY_INVALID' });
  }
  const current = accessibilityConfig.settings;
  const next = {
    ...current
  };
  if (settings.minimumContrastRatio !== undefined) {
    const ratio = Number(settings.minimumContrastRatio);
    if (Number.isFinite(ratio) && ratio > 0) {
      next.minimumContrastRatio = ratio;
    }
  }
  if (settings.supportsHighContrastMode !== undefined) {
    next.supportsHighContrastMode = Boolean(settings.supportsHighContrastMode);
  }
  if (settings.dynamicTextScale !== undefined) {
    next.dynamicTextScale = Boolean(settings.dynamicTextScale);
  }
  if (settings.prefersReducedMotion !== undefined) {
    next.prefersReducedMotion = Boolean(settings.prefersReducedMotion);
  }
  if (settings.supportsRTL !== undefined) {
    next.supportsRTL = Boolean(settings.supportsRTL);
  }
  accessibilityConfig = {
    ...accessibilityConfig,
    settings: next
  };
  bumpConfig(accessibilityConfig);
}

function getBanEntry(playerId) {
  const id = typeof playerId === 'string' ? playerId.trim() : '';
  if (!id) {
    return null;
  }
  const entry = bannedPlayers.get(id);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    bannedPlayers.delete(id);
    return null;
  }
  return entry;
}

function banPlayer(playerId, options = {}) {
  const id = typeof playerId === 'string' ? playerId.trim() : '';
  if (!id) {
    raise('ADMIN_PLAYER_REQUIRED');
  }
  const reason = typeof options.reason === 'string' && options.reason.trim() ? options.reason.trim() : 'policy_violation';
  const expiresAt = options.expiresAt ? Number(new Date(options.expiresAt).getTime()) : null;
  const entry = {
    playerId: id,
    reason,
    bannedAt: Date.now(),
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : null
  };
  bannedPlayers.set(id, entry);
  return clone(entry);
}

function unbanPlayer(playerId) {
  const id = typeof playerId === 'string' ? playerId.trim() : '';
  if (!id) {
    raise('ADMIN_PLAYER_REQUIRED');
  }
  const existed = bannedPlayers.delete(id);
  return existed;
}

function listBannedPlayers() {
  return Array.from(bannedPlayers.values()).map((entry) => clone(entry));
}

function reset() {
  taskConfig = {
    version: Date.now(),
    updatedAt: Date.now(),
    definitions: DEFAULT_TASK_DEFINITIONS
  };
  bannerConfig = {
    version: Date.now(),
    updatedAt: Date.now(),
    items: DEFAULT_BANNERS
  };
  announcementConfig = {
    version: Date.now(),
    updatedAt: Date.now(),
    announcement: DEFAULT_ANNOUNCEMENT
  };
  accessibilityConfig = {
    version: Date.now(),
    updatedAt: Date.now(),
    settings: DEFAULT_ACCESSIBILITY
  };
  bannedPlayers.clear();
}

module.exports = {
  setTaskDefinitions,
  getTaskDefinitions,
  getTaskConfig,
  getTaskConfigVersion,
  findTaskDefinition,
  setBanners,
  getBanners,
  getActiveBanners,
  updateAnnouncement,
  getAnnouncement,
  getActiveAnnouncement,
  getAccessibilitySettings,
  updateAccessibilitySettings,
  banPlayer,
  unbanPlayer,
  listBannedPlayers,
  getBanEntry,
  reset
};
