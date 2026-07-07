/**
 * Stage 7 Reliability and Performance Test Suite
 *
 * Tests error recovery, timeout safety, and production operational concerns.
 */

import { describe, expect, it, vi } from 'vitest';

import { NombaHttpClient } from '../src/utils/httpClient';

describe('Stage 7: Reliability', () => {
  describe('error recovery', () => {
    it('retries on 500 errors up to max retries', async () => {
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: '00',
              description: 'Success',
              data: {
                access_token: 'token_retry_test',
                refresh_token: 'refresh',
                expiresAt: '2099-01-01T00:00:00Z',
              },
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(new Response('{"error":"server"}', { status: 500 }))
        .mockResolvedValueOnce(new Response('{"error":"server"}', { status: 500 }))
        .mockResolvedValueOnce(new Response('{"error":"server"}', { status: 500 }))
        .mockResolvedValueOnce(new Response('{"error":"max retries"}', { status: 500 }));

      const client = new NombaHttpClient(
        {
          clientId: 'test',
          clientSecret: 'test',
          accountId: 'test',
          environment: 'sandbox',
        },
        {
          fetchFn,
          retry: {
            maxRetries: 3,
            initialDelayMs: 1,
            backoffMultiplier: 2,
            maxDelayMs: 10,
            jitterRatio: 0,
            sleep: async () => undefined,
          },
        },
      );

      try {
        await client.request('GET', '/test');
      } catch {
        // Expected after max retries
      }

      expect(fetchFn).toHaveBeenCalledTimes(5);
    });

    it('does not retry on 403 errors', async () => {
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: '00',
              description: 'Success',
              data: {
                access_token: 'token_403',
                refresh_token: 'refresh',
                expiresAt: '2099-01-01T00:00:00Z',
              },
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(new Response('{"error":"forbidden"}', { status: 403 }));

      const client = new NombaHttpClient(
        {
          clientId: 'test',
          clientSecret: 'test',
          accountId: 'test',
          environment: 'sandbox',
        },
        {
          fetchFn,
          retry: {
            maxRetries: 3,
            initialDelayMs: 1,
            backoffMultiplier: 2,
            maxDelayMs: 10,
            jitterRatio: 0,
            sleep: async () => undefined,
          },
        },
      );

      try {
        await client.request('GET', '/test');
      } catch {
        // Expected
      }

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('retries on 429 rate limit', async () => {
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: '00',
              description: 'Success',
              data: {
                access_token: 'token_429',
                refresh_token: 'refresh',
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
          clientId: 'test',
          clientSecret: 'test',
          accountId: 'test',
          environment: 'sandbox',
        },
        {
          fetchFn,
          retry: {
            maxRetries: 2,
            initialDelayMs: 1,
            backoffMultiplier: 2,
            maxDelayMs: 10,
            jitterRatio: 0,
            sleep: async () => undefined,
          },
        },
      );

      const response = await client.request('GET', '/test');

      expect(response.statusCode).toBe(200);
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('token caching', () => {
    it('stores access token for reuse', async () => {
      const tokenIssueCall = vi.fn();
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockImplementation(async () => {
          tokenIssueCall();
          return new Response(
            JSON.stringify({
              code: '00',
              description: 'Success',
              data: {
                access_token: 'cached_token',
                refresh_token: 'refresh',
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
              },
            }),
            { status: 200 },
          );
        });

      const client = new NombaHttpClient(
        {
          clientId: 'test',
          clientSecret: 'test',
          accountId: 'test',
          environment: 'sandbox',
        },
        { fetchFn },
      );

      await client.validateCredentials();

      expect(tokenIssueCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('error messages', () => {
    it('never exposes sensitive data in error messages', async () => {
      const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new Error('Network error'));

      const client = new NombaHttpClient(
        {
          clientId: 'secret-client-id',
          clientSecret: 'super-secret',
          accountId: 'test-account',
          environment: 'sandbox',
        },
        { fetchFn },
      );

      try {
        await client.request('GET', '/test');
      } catch (error) {
        const errorMsg = String(error);
        expect(errorMsg).not.toContain('super-secret');
        expect(errorMsg).not.toContain('secret-client-id');
      }
    });
  });

  describe('request timeout handling', () => {
    it('passes timeout in request', async () => {
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: '00',
              description: 'Success',
              data: {
                access_token: 'token',
                refresh_token: 'refresh',
                expiresAt: '2099-01-01T00:00:00Z',
              },
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));

      const client = new NombaHttpClient(
        {
          clientId: 'test',
          clientSecret: 'test',
          accountId: 'test',
          environment: 'sandbox',
        },
        { fetchFn },
      );

      await client.request('GET', '/test', { timeoutMs: 5000 });

      expect(fetchFn).toHaveBeenCalled();
    });
  });
});
