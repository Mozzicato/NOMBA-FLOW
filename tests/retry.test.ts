import { describe, expect, it, vi } from 'vitest';

import { computeBackoffDelay, retryWithBackoff, shouldRetry } from '../src/utils/retry';

describe('shouldRetry', () => {
  it('retries 429 and 5xx', () => {
    expect(shouldRetry({ statusCode: 429 })).toBe(true);
    expect(shouldRetry({ statusCode: 500 })).toBe(true);
    expect(shouldRetry({ statusCode: 503 })).toBe(true);
  });

  it('does not retry non-429 client errors', () => {
    expect(shouldRetry({ statusCode: 400 })).toBe(false);
    expect(shouldRetry({ statusCode: 404 })).toBe(false);
  });

  it('retries supported network errors', () => {
    expect(shouldRetry({ code: 'ETIMEDOUT' })).toBe(true);
    expect(shouldRetry({ code: 'ECONNRESET' })).toBe(true);
    expect(shouldRetry({ code: 'EINVAL' })).toBe(false);
  });
});

describe('computeBackoffDelay', () => {
  it('applies deterministic backoff with custom random function', () => {
    const delay = computeBackoffDelay(2, {
      maxRetries: 3,
      initialDelayMs: 500,
      backoffMultiplier: 2,
      maxDelayMs: 10_000,
      jitterRatio: 0.1,
      randomFn: () => 0,
    });

    expect(delay).toBe(1000);
  });
});

describe('retryWithBackoff', () => {
  it('retries once and returns successful result', async () => {
    const sleep = vi.fn(async () => undefined);
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ statusCode: 429 })
      .mockResolvedValueOnce('ok');

    const result = await retryWithBackoff(operation, {
      maxRetries: 3,
      initialDelayMs: 100,
      backoffMultiplier: 2,
      maxDelayMs: 1000,
      jitterRatio: 0,
      sleep,
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('throws when retry limit is exceeded', async () => {
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue({ statusCode: 500 });

    await expect(
      retryWithBackoff(operation, {
        maxRetries: 1,
        initialDelayMs: 100,
        backoffMultiplier: 2,
        maxDelayMs: 1000,
        jitterRatio: 0,
        sleep: async () => undefined,
      }),
    ).rejects.toEqual({ statusCode: 500 });

    expect(operation).toHaveBeenCalledTimes(2);
  });
});
