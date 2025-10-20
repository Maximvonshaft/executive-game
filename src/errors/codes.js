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
    message: 'Authorization token is required.',
    userMessage: '登录状态已失效，请重新登录。'
  },
  AUTH_INVALID_TOKEN: {
    httpStatus: 401,
    message: 'Authorization token is invalid.',
    userMessage: '会话验证失败，请重新登录。'
  },
  CONFIG_MISSING_SECRET: {
    httpStatus: 500,
    message: 'Required secret is missing from environment.',
    userMessage: '服务配置缺失，请稍后重试。'
  },
  MATCH_ALREADY_SEARCHING: {
    httpStatus: 409,
    message: 'Player is already searching for a match.',
    userMessage: '正在匹配中，请耐心等待。'
  },
  MATCH_NOT_IN_QUEUE: {
    httpStatus: 404,
    message: 'Player does not have an active matchmaking ticket.',
    userMessage: '当前没有进行中的匹配请求。'
  },
  MATCH_UNSUPPORTED_GAME: {
    httpStatus: 400,
    message: 'Requested game is not available for matchmaking.',
    userMessage: '该游戏暂不可匹配，请稍后再试。'
  },
  ROOM_NOT_FOUND: {
    httpStatus: 404,
    message: 'Room is not found.',
    userMessage: '房间不存在或已结束。'
  },
  ROOM_NOT_MEMBER: {
    httpStatus: 403,
    message: 'Player is not part of the room.',
    userMessage: '你没有加入该房间。'
  },
  ROOM_FULL: {
    httpStatus: 409,
    message: 'Room has no available seats.',
    userMessage: '房间人数已满，无法加入。'
  },
  ROOM_ALREADY_READY: {
    httpStatus: 409,
    message: 'Player is already marked as ready.',
    userMessage: '已准备完毕，请等待对手。'
  },
  ROOM_ACTION_INVALID: {
    httpStatus: 422,
    message: 'Action is invalid for current room state.',
    userMessage: '当前操作无效，请检查后重试。'
  },
  ROOM_ACTION_OUT_OF_TURN: {
    httpStatus: 409,
    message: 'Action attempted out of turn.',
    userMessage: '还未轮到你行动。'
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
