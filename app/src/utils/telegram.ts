type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: { [key: string]: unknown } & { query_id?: string };
};

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};

export type InitDataResolution = {
  value: string;
  source: 'webapp' | 'query' | 'hash';
};

function sanitizeInitData(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveFromTelegramWebApp(): InitDataResolution | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const telegram = (window as TelegramWindow).Telegram?.WebApp;
  if (!telegram) {
    return null;
  }

  const initData = sanitizeInitData(telegram.initData);
  if (initData) {
    return { value: initData, source: 'webapp' };
  }

  const unsafe = telegram.initDataUnsafe as { initData?: string } | undefined;
  const unsafeInit = sanitizeInitData(unsafe?.initData);
  if (unsafeInit) {
    return { value: unsafeInit, source: 'webapp' };
  }

  return null;
}

const SEARCH_KEYS = ['tgWebAppData', 'initData', 'tgAuthResult', 'authData'];

function extractFromParams(params: URLSearchParams): string | null {
  for (const key of SEARCH_KEYS) {
    const value = sanitizeInitData(params.get(key));
    if (value) {
      return value;
    }
  }
  return null;
}

function resolveFromLocationSearch(): InitDataResolution | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const initData = extractFromParams(new URLSearchParams(window.location.search));
  if (!initData) {
    return null;
  }
  return { value: initData, source: 'query' };
}

function resolveFromLocationHash(): InitDataResolution | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) {
    return null;
  }
  const params = new URLSearchParams(hash);
  const initData = extractFromParams(params);
  if (!initData) {
    return null;
  }
  return { value: initData, source: 'hash' };
}

export function resolveTelegramInitData(): InitDataResolution | null {
  return resolveFromTelegramWebApp() ?? resolveFromLocationSearch() ?? resolveFromLocationHash();
}
