export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  jitterRatio?: number;
  randomFn?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface HttpLikeError {
  statusCode?: number;
  code?: string;
}

const RETRIABLE_NETWORK_CODES = new Set(['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND']);

export function shouldRetry(error: HttpLikeError): boolean {
  if (error.statusCode === 429) {
    return true;
  }

  if (error.statusCode !== undefined && error.statusCode >= 500) {
    return true;
  }

  return error.code !== undefined && RETRIABLE_NETWORK_CODES.has(error.code);
}

export function computeBackoffDelay(attempt: number, options: RetryOptions): number {
  const baseDelay = options.initialDelayMs * options.backoffMultiplier ** Math.max(0, attempt - 1);
  const boundedDelay = Math.min(baseDelay, options.maxDelayMs);
  const jitterRatio = options.jitterRatio ?? 0.2;
  const randomFn = options.randomFn ?? Math.random;
  const jitter = boundedDelay * jitterRatio * randomFn();

  return Math.round(boundedDelay + jitter);
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void,
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;

      const err = error as HttpLikeError;
      const canRetry = shouldRetry(err);

      if (!canRetry || attempt > options.maxRetries) {
        throw error;
      }

      const delay = computeBackoffDelay(attempt, options);
      onRetry?.(attempt, delay, error);

      const sleep = options.sleep ?? defaultSleep;
      await sleep(delay);
    }
  }
}
