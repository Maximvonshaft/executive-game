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
  CONFIG_MISSING_SECRET: {
    httpStatus: 500,
    message: 'Required secret is missing from environment.',
    userMessage: '服务配置缺失，请稍后重试。'
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
