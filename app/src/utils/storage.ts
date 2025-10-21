export type StoredUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  languageCode: string;
  photoUrl: string;
};

const TOKEN_KEY = 'executive-session-token';
const USER_KEY = 'executive-session-user';

export function readToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function writeToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function readUser(): StoredUser | null {
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredUser;
  } catch (error) {
    console.warn('读取用户缓存失败', error);
    window.localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function writeUser(user: StoredUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  window.localStorage.removeItem(USER_KEY);
}
