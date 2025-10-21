import errorCodeDefinitions from '../../../../shared/error-codes.json';

type ErrorCodeDefinition = {
  httpStatus: number;
  message: string;
  userMessage?: string;
};

export type ErrorDictionary = Record<string, { message: string; userMessage: string }>;

const entries = Object.entries(errorCodeDefinitions as Record<string, ErrorCodeDefinition>).map(
  ([code, value]) => [
    code,
    {
      message: value.message,
      userMessage: value.userMessage ?? value.message
    }
  ]
);

export const errorDictionary: ErrorDictionary = Object.fromEntries(entries);
