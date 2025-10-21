import { createRestClient, RestClient } from '../lib/api';
import { clearToken, clearUser, readToken, readUser, writeToken, writeUser } from '../utils/storage';

let client: RestClient | null = null;

export function getRestClient() {
  if (!client) {
    client = createRestClient({
      baseUrl: '/api',
      getToken: () => readToken(),
      onUnauthorized: () => {
        clearToken();
        clearUser();
      }
    });
  }
  return client;
}

export function persistSession(session: { token: string; user: unknown }) {
  writeToken(session.token);
  if (session.user && typeof session.user === 'object') {
    writeUser(session.user as never);
  }
}

export function resetSession() {
  clearToken();
  clearUser();
}

export function getCachedSession() {
  return {
    token: readToken(),
    user: readUser()
  };
}
