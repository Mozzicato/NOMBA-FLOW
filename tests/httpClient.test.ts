import { describe, expect, it, vi } from 'vitest';

import { buildAuthHeaders, NombaHttpClient, type Logger } from '../src/utils/httpClient';

describe('buildAuthHeaders', () => {
  it('builds headers with access token and accountId', () => {
    const headers = buildAuthHeaders('token_123', 'f666ef9b-888e-4799-85ce-acb505b28023');

    expect(headers.Authorization).toBe('Bearer token_123');
    expect(headers.accountId).toBe('f666ef9b-888e-4799-85ce-acb505b28023');
    expect(headers['Content-Type']).toBe('application/json');
  });
});

describe('NombaHttpClient', () => {
  it('obtains access token and sends accountId header', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: '00',
            description: 'Success',
            data: {
              access_token: 'token_abc',
              refresh_token: 'refresh_abc',
              expiresAt: '2099-01-01T00:00:00Z',
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));

    const client = new NombaHttpClient(
      {
        clientId: '706df6c4-b8bb-4130-88c4-d21b052f8631',
        clientSecret: 'secret_123',
        accountId: 'f666ef9b-888e-4799-85ce-acb505b28023',
        environment: 'sandbox',
      },
      {
        fetchFn,
      },
    );

    await client.request('GET', '/v1/transactions/accounts/c3e673d2-8855-494a-9c48-f4d2b92f8db2');

    const secondCall = fetchFn.mock.calls[1];
    const secondHeaders = secondCall[1]?.headers as Record<string, string>;

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(secondHeaders.Authorization).toBe('Bearer token_abc');
    expect(secondHeaders.accountId).toBe('f666ef9b-888e-4799-85ce-acb505b28023');
  });

  it('reuses cached access token before expiry', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: '00',
            description: 'Success',
            data: {
              access_token: 'token_cached',
              refresh_token: 'refresh_cached',
              expiresAt: '2099-01-01T00:00:00Z',
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));

    const client = new NombaHttpClient(
      {
        clientId: '706df6c4-b8bb-4130-88c4-d21b052f8631',
        clientSecret: 'secret_123',
        accountId: 'f666ef9b-888e-4799-85ce-acb505b28023',
        environment: 'sandbox',
      },
      {
        fetchFn,
      },
    );

    await client.request('GET', '/v1/checkout/transaction', { query: { idType: 'ORDER_ID', id: 'abc' } });
    await client.request('GET', '/v1/checkout/transaction', { query: { idType: 'ORDER_ID', id: 'def' } });

    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('retries on 429 and succeeds', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: '00',
            description: 'Success',
            data: {
              access_token: 'token_for_retry',
              refresh_token: 'refresh_for_retry',
              expiresAt: '2099-01-01T00:00:00Z',
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('{"error":"rate limited"}', { status: 429 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));

    const client = new NombaHttpClient(
      {
        clientId: '706df6c4-b8bb-4130-88c4-d21b052f8631',
        clientSecret: 'secret_123',
        accountId: 'f666ef9b-888e-4799-85ce-acb505b28023',
        environment: 'sandbox',
      },
      {
        fetchFn,
        retry: {
          maxRetries: 2,
          initialDelayMs: 1,
          backoffMultiplier: 2,
          maxDelayMs: 2,
          jitterRatio: 0,
          sleep: async () => undefined,
        },
      },
    );

    const response = await client.request<{ ok: boolean }>('GET', '/v1/transactions');

    expect(response.statusCode).toBe(200);
    expect(response.data.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('redacts secrets in logs', async () => {
    const logs: Array<{ message: string; context?: Record<string, unknown> }> = [];
    const logger: Logger = {
      debug: (message, context) => {
        logs.push({ message, context });
      },
    };

    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: '00',
            description: 'Success',
            data: {
              access_token: 'token_log',
              refresh_token: 'refresh_log',
              expiresAt: '2099-01-01T00:00:00Z',
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const client = new NombaHttpClient(
      {
        clientId: '706df6c4-b8bb-4130-88c4-d21b052f8631',
        clientSecret: 'secret_supersecret',
        accountId: 'f666ef9b-888e-4799-85ce-acb505b28023',
        environment: 'sandbox',
      },
      {
        fetchFn,
        logger,
      },
    );

    await client.request('GET', '/v1/transactions');

    const tokenLog = logs.find((entry) => entry.message === 'Nomba token request');
    const requestLog = logs.find((entry) => entry.message === 'Nomba request');
    const tokenHeaders = tokenLog?.context?.headers as Record<string, string>;
    const requestHeaders = requestLog?.context?.headers as Record<string, string>;

    expect(tokenHeaders.accountId).toBe('f666ef9b-888e-4799-85ce-acb505b28023');
    expect(requestHeaders.Authorization).not.toContain('token_log');
  });
});
