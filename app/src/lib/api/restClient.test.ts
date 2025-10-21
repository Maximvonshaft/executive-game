import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestClient } from './restClient';

declare global {
  // eslint-disable-next-line no-var
  var fetch: typeof globalThis.fetch;
}

const mockFetch = vi.fn();

function createResponse({
  ok,
  status,
  json
}: {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}) {
  return {
    ok,
    status,
    json,
    headers: new Headers(),
    statusText: '',
    redirected: false,
    type: 'basic'
  } as Response;
}

describe('RestClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('附带 token 并解析数据', async () => {
    mockFetch.mockResolvedValue(
      createResponse({
        ok: true,
        status: 200,
        json: async () => ({ data: { greeting: 'hello' } })
      })
    );
    const client = new RestClient({
      baseUrl: 'https://api.example.com',
      getToken: () => 'token-123'
    });
    const data = await client.request<{ greeting: string }>('/hello', { method: 'GET' });
    expect(data.greeting).toBe('hello');
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/hello', expect.any(Object));
    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit).headers).toBeInstanceOf(Headers);
    expect((init as RequestInit).headers?.get('Authorization')).toBe('Bearer token-123');
  });

  it('映射错误码为字典提示', async () => {
    mockFetch.mockResolvedValue(
      createResponse({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: { code: 'AUTH_TOKEN_INVALID' } })
      })
    );
    const unauthorized = vi.fn();
    const client = new RestClient({
      baseUrl: 'https://api.example.com',
      getToken: () => 'bad-token',
      onUnauthorized: unauthorized
    });
    await expect(client.request('/secure')).rejects.toMatchObject({ code: 'AUTH_TOKEN_INVALID' });
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it('服务端异常时返回兜底文案', async () => {
    mockFetch.mockResolvedValue(
      createResponse({
        ok: false,
        status: 503,
        json: async () => ({})
      })
    );
    const client = new RestClient({
      baseUrl: 'https://api.example.com',
      getToken: () => null
    });
    await expect(client.request('/unstable')).rejects.toMatchObject({
      code: 'SERVER_ERROR',
      status: 503
    });
  });

  it('AI 请求节流提示剩余时间', () => {
    mockFetch.mockResolvedValue(
      createResponse({
        ok: true,
        status: 200,
        json: async () => ({ data: {} })
      })
    );
    const client = new RestClient({
      baseUrl: 'https://api.example.com',
      getToken: () => null
    });
    const result = client.throttleAiRequest('gomoku', 2000);
    expect(result).toBe(true);
    vi.setSystemTime(Date.now() + 1000);
    const second = client.throttleAiRequest('gomoku', 2000);
    expect(second).toBe(false);
  });
});
