export function isTimestampWithinTolerance(
  timestamp: string,
  toleranceSeconds: number,
  nowMs = Date.now(),
): boolean {
  const parsedTimestamp = Date.parse(timestamp);
  if (Number.isNaN(parsedTimestamp)) {
    return false;
  }

  const diffMs = Math.abs(nowMs - parsedTimestamp);
  return diffMs <= toleranceSeconds * 1000;
}

export function extractReplayId(body: unknown): string | undefined {
  const root = (body ?? {}) as Record<string, unknown>;
  const requestId = root.requestId;
  if (typeof requestId === 'string' && requestId.trim().length > 0) {
    return requestId.trim();
  }

  const data = (root.data ?? {}) as Record<string, unknown>;
  const transaction = (data.transaction ?? {}) as Record<string, unknown>;
  const transactionId = transaction.transactionId;
  if (typeof transactionId === 'string' && transactionId.trim().length > 0) {
    return transactionId.trim();
  }

  return undefined;
}

export class ReplayWindowStore {
  private readonly store = new Map<string, number>();

  registerOrReject(replayId: string, ttlSeconds: number, nowMs = Date.now()): boolean {
    this.evictExpired(nowMs);

    const existingExpiry = this.store.get(replayId);
    if (existingExpiry !== undefined && existingExpiry > nowMs) {
      return false;
    }

    this.store.set(replayId, nowMs + ttlSeconds * 1000);
    return true;
  }

  private evictExpired(nowMs: number): void {
    for (const [key, expiry] of this.store.entries()) {
      if (expiry <= nowMs) {
        this.store.delete(key);
      }
    }
  }
}

export const globalReplayWindowStore = new ReplayWindowStore();
