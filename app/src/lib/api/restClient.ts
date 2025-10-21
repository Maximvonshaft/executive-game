import mitt from 'mitt';
import { errorDictionary } from './errorDictionary';

export type RestClientOptions = {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized?: () => void;
  retry?: {
    attempts: number;
    delayMs: number;
  };
};

export type RestError = {
  code: string;
  status: number;
  message: string;
  userMessage: string;
};

export type RestEventMap = {
  error: RestError;
};

const DEFAULT_RETRY = {
  attempts: 2,
  delayMs: 800
};

export class RestClient {
  private readonly options: RestClientOptions;
  private readonly emitter = mitt<RestEventMap>();
  private readonly aiCooldown = new Map<string, number>();

  constructor(options: RestClientOptions) {
    this.options = { ...options };
  }

  on<Event extends keyof RestEventMap>(event: Event, handler: (payload: RestEventMap[Event]) => void) {
    this.emitter.on(event, handler);
    return () => this.emitter.off(event, handler);
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const retry = this.options.retry ?? DEFAULT_RETRY;
    let lastError: RestError | null = null;

    for (let attempt = 0; attempt <= retry.attempts; attempt += 1) {
      try {
        const response = await this.performRequest<T>(path, init);
        return response;
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          lastError = error as RestError;
          if (lastError.code === 'AUTH_TOKEN_INVALID' || lastError.code === 'AUTH_EXPIRED') {
            this.options.onUnauthorized?.();
            break;
          }
        }

        if (attempt < retry.attempts) {
          await this.delay(retry.delayMs * (attempt + 1));
          continue;
        }

        throw error;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('请求失败且未捕获错误详情');
  }

  private async performRequest<T>(path: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    const token = this.options.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After') ?? '1') * 1000;
      await this.delay(retryAfter);
      return this.performRequest<T>(path, init);
    }

    if (response.status >= 500) {
      throw this.emitError({
        code: 'SERVER_ERROR',
        status: response.status,
        message: '服务器开小差，请稍后重试',
        userMessage: '服务器暂时不可用，请稍后重试'
      });
    }

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorCode = json?.error?.code ?? 'SERVER_ERROR';
      throw this.emitError(this.mapError(errorCode, response.status));
    }

    return json.data as T;
  }

  private mapError(code: string, status: number): RestError {
    const entry = errorDictionary[code];
    if (!entry) {
      return {
        code,
        status,
        message: '发生未知错误',
        userMessage: '系统出现未知错误，请稍后再试'
      };
    }
    return {
      code,
      status,
      message: entry.message,
      userMessage: entry.userMessage
    };
  }

  throttleAiRequest(key: string, cooldownMs: number): boolean {
    const now = Date.now();
    const unlockAt = this.aiCooldown.get(key) ?? 0;
    if (now < unlockAt) {
      this.emitError({
        code: 'AI_THROTTLED',
        status: 429,
        message: 'AI 请求过于频繁',
        userMessage: `请等待 ${Math.ceil((unlockAt - now) / 1000)} 秒后再试`
      });
      return false;
    }
    this.aiCooldown.set(key, now + cooldownMs);
    return true;
  }

  private emitError(error: RestError): RestError {
    this.emitter.emit('error', error);
    return error;
  }
}

export function createRestClient(options: RestClientOptions) {
  return new RestClient(options);
}
