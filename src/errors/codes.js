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
  ROOM_NOT_MEMBER: {
    httpStatus: 403,
    message: 'Player is not part of the room.',
    userMessage: '您无权访问该房间。'
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
