import { ERROR_CODES } from '../../../../src/errors/codes.js';

export type ErrorDictionary = Record<string, { message: string; userMessage: string }>;

const entries = Object.entries(ERROR_CODES).map(([code, value]) => [
  code,
  {
    message: value.message,
    userMessage: value.userMessage ?? value.message
  }
]);

export const errorDictionary: ErrorDictionary = Object.fromEntries(entries);
