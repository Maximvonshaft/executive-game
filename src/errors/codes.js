const errorCodeDefinitions = require('../../shared/error-codes.json');

function freezeErrorDefinitions(definitions) {
  const frozen = {};
  for (const [code, value] of Object.entries(definitions)) {
    frozen[code] = Object.freeze({
      httpStatus: value.httpStatus,
      message: value.message,
      userMessage: value.userMessage
    });
  }
  return Object.freeze(frozen);
}

const ERROR_CODES = freezeErrorDefinitions(errorCodeDefinitions);

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
