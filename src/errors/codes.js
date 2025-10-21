const ERROR_CODES = {
  AUTH_INITDATA_REQUIRED: {
    httpStatus: 400,
    message: 'Telegram initData is required.',
    userMessage: '缺少登录凭证，请重新发起登录。'
  },
  AUTH_MALFORMED_INITDATA: {
    httpStatus: 400,
    message: 'Telegram initData is malformed.',
    userMessage: '登录凭证格式异常，请重新登录。'
  },
  AUTH_HASH_MISSING: {
    httpStatus: 400,
    message: 'Telegram initData hash is missing.',
    userMessage: '登录凭证不完整，请重新登录。'
  },
  AUTH_INVALID_SIGNATURE: {
    httpStatus: 401,
    message: 'Telegram initData signature mismatch.',
    userMessage: '登录状态已失效，请重新登录。'
  },
  AUTH_EXPIRED: {
    httpStatus: 401,
    message: 'Telegram initData is expired.',
    userMessage: '登录已过期，请重新登录。'
  },
  AUTH_TOKEN_REQUIRED: {
    httpStatus: 401,
    message: 'Authorization token required.',
    userMessage: '请先登录后再进行操作。'
  },
  AUTH_TOKEN_INVALID: {
    httpStatus: 401,
    message: 'Authorization token is invalid.',
    userMessage: '会话已失效，请重新登录。'
  },
  REQUEST_BODY_INVALID: {
    httpStatus: 400,
    message: 'Request body is not valid JSON.',
    userMessage: '请求格式错误，请稍后重试。'
  },
  MATCH_GAME_NOT_FOUND: {
    httpStatus: 404,
    message: 'Requested game was not found.',
    userMessage: '找不到对应的游戏，请刷新后重试。'
  },
  MATCH_PLAYER_IN_ROOM: {
    httpStatus: 409,
    message: 'Player already participates in an active room.',
    userMessage: '正在进行中的对局无法重复匹配。'
  },
  MATCH_TICKET_NOT_FOUND: {
    httpStatus: 404,
    message: 'Matchmaking ticket not found.',
    userMessage: '匹配请求不存在或已过期。'
  },
  MATCH_TICKET_FORBIDDEN: {
    httpStatus: 403,
    message: 'Ticket does not belong to the current player.',
    userMessage: '无权取消该匹配请求。'
  },
  MATCH_ALREADY_ASSIGNED: {
    httpStatus: 409,
    message: 'Match already assigned to a room.',
    userMessage: '对局已生成，无法取消。'
  },
  ROOM_NOT_FOUND: {
    httpStatus: 404,
    message: 'Room not found.',
    userMessage: '房间不存在或已关闭。'
  },
  REPLAY_NOT_FOUND: {
    httpStatus: 404,
    message: 'Replay not found.',
    userMessage: '暂未找到该对局的审计记录。'
  },
  ROOM_NOT_MEMBER: {
    httpStatus: 403,
    message: 'Player is not part of the room.',
    userMessage: '您无权访问该房间。'
  },
  ROOM_NOT_OWNER: {
    httpStatus: 403,
    message: 'Only the room owner can perform this action.',
    userMessage: '只有房主可以执行该操作。'
  },
  ROOM_ID_REQUIRED: {
    httpStatus: 400,
    message: 'Room id is required.',
    userMessage: '缺少房间编号。'
  },
  ROOM_ALREADY_FINISHED: {
    httpStatus: 409,
    message: 'Room already finished.',
    userMessage: '对局已结束。'
  },
  ROOM_ALREADY_ACTIVE: {
    httpStatus: 409,
    message: 'Room is already in progress.',
    userMessage: '对局正在进行中，无法加入。'
  },
  ROOM_INVITE_INVALID: {
    httpStatus: 403,
    message: 'Invite code is invalid or expired.',
    userMessage: '邀请码无效或已过期。'
  },
  ROOM_FULL: {
    httpStatus: 409,
    message: 'Room is already full.',
    userMessage: '房间人数已满，无法加入。'
  },
  ROOM_PLAYER_BLOCKED: {
    httpStatus: 403,
    message: 'Player is blocked by the room owner or participants.',
    userMessage: '您已被房主或成员拉黑，无法加入房间。'
  },
  ROOM_SPECTATORS_DISABLED: {
    httpStatus: 403,
    message: 'Spectators are disabled for this room.',
    userMessage: '该房间未开启观战功能。'
  },
  ROOM_SPECTATORS_LIMIT: {
    httpStatus: 429,
    message: 'Spectator limit reached for this room.',
    userMessage: '观战人数已达上限，请稍后再试。'
  },
  ROOM_SPECTATOR_FORBIDDEN: {
    httpStatus: 403,
    message: 'Spectators cannot perform this action.',
    userMessage: '观战模式下无法执行此操作。'
  },
  ACTION_FRAME_REPLAYED: {
    httpStatus: 409,
    message: 'Action frame already processed.',
    userMessage: '动作已被处理，请等待回放同步。'
  },
  ACTION_FRAME_OUT_OF_SYNC: {
    httpStatus: 409,
    message: 'Action frame sequence mismatch.',
    userMessage: '动作顺序异常，请刷新后重试。'
  },
  ACTION_DUPLICATE: {
    httpStatus: 409,
    message: 'Duplicate idempotent action received.',
    userMessage: '重复的操作请求已忽略。'
  },
  ROOM_ACTION_UNSUPPORTED: {
    httpStatus: 400,
    message: 'Requested room action is not supported.',
    userMessage: '不支持的房间操作。'
  },
  AI_GAME_UNSUPPORTED: {
    httpStatus: 400,
    message: 'Requested game is not supported for AI suggestions.',
    userMessage: '当前玩法暂不支持 AI 建议。'
  },
  AI_POSITION_INVALID: {
    httpStatus: 400,
    message: 'Provided position is invalid or inconsistent.',
    userMessage: '局面数据不合法，请检查后再试。'
  },
  AI_RATE_LIMITED: {
    httpStatus: 429,
    message: 'Suggestion frequency limit reached.',
    userMessage: '提示请求过于频繁，请稍后再试。'
  },
  CONFIG_MISSING_SECRET: {
    httpStatus: 500,
    message: 'Required secret is missing from configuration.',
    userMessage: '服务配置缺失，请稍后重试。'
  },
  TASK_NOT_FOUND: {
    httpStatus: 404,
    message: 'Task definition not found.',
    userMessage: '任务不存在或已下线。'
  },
  TASK_NOT_AVAILABLE: {
    httpStatus: 404,
    message: 'Task is not available for the player.',
    userMessage: '当前无法领取该任务，请刷新后再试。'
  },
  TASK_NOT_COMPLETED: {
    httpStatus: 409,
    message: 'Task requirements not met.',
    userMessage: '任务尚未完成，继续加油吧。'
  },
  TASK_ALREADY_CLAIMED: {
    httpStatus: 409,
    message: 'Task reward already claimed.',
    userMessage: '奖励已领取，请勿重复操作。'
  },
  FRIEND_SELF_FORBIDDEN: {
    httpStatus: 400,
    message: 'Cannot add yourself as a friend.',
    userMessage: '无法添加自己为好友。'
  },
  FRIEND_TARGET_REQUIRED: {
    httpStatus: 400,
    message: 'Friend target is required.',
    userMessage: '请指定要操作的玩家。'
  },
  SERVER_ERROR: {
    httpStatus: 500,
    message: 'Unexpected server error.',
    userMessage: '系统开小差了，请稍后再试。'
  }
};

class ApplicationError extends Error {
  constructor(code, options = {}) {
    const definition = ERROR_CODES[code] || ERROR_CODES.SERVER_ERROR;
    super(definition.message);
    this.name = 'ApplicationError';
    this.code = code;
    this.httpStatus = definition.httpStatus;
    this.userMessage = definition.userMessage;
    if (options.cause) {
      this.cause = options.cause;
    }
    if (options.meta) {
      this.meta = options.meta;
    }
  }
}

function createError(code, options) {
  return new ApplicationError(code, options);
}

module.exports = {
  ERROR_CODES,
  ApplicationError,
  createError
};
