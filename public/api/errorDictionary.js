export const ERROR_DICTIONARY = {
  REQUEST_BODY_INVALID: '请求体格式异常，请重试。',
  TELEGRAM_INIT_DATA_INVALID: '登录信息已过期，请重新打开 Telegram 小程序。',
  TELEGRAM_AUTH_SIGNATURE_INVALID: 'Telegram 登录签名校验失败。',
  TOKEN_INVALID: '身份已失效，请重新登录。',
  TOKEN_EXPIRED: '登录状态已过期，请重新登录。',
  PLAYER_BANNED: '账号已被限制，请联系管理员。',
  MATCH_NOT_FOUND: '未找到匹配信息，请重新排队。',
  ROOM_NOT_FOUND: '房间已关闭或不存在。',
  MATCH_ALREADY_IN_PROGRESS: '对局正在进行中，无法执行该操作。',
  MATCH_ACTION_INVALID: '该操作不合法，请确认规则后再试。',
  MATCH_ALREADY_FINISHED: '对局已结束。',
  FRIEND_ALREADY_EXISTS: '已经是好友。',
  FRIEND_NOT_FOUND: '未找到该好友。',
  RATE_LIMITED: '操作过于频繁，请稍后再试。',
  AI_SUGGESTION_COOLDOWN: 'AI 建议冷却中，请稍后再试。',
  ADMIN_PERMISSION_DENIED: '权限不足，无法访问运营后台。',
  SERVER_ERROR: '服务器异常，请稍后重试。'
};

export function resolveErrorMessage(code, fallback) {
  if (!code) {
    return fallback || '发生未知错误';
  }
  return ERROR_DICTIONARY[code] || fallback || `发生错误：${code}`;
}
