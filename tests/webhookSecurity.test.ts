import { describe, expect, it } from 'vitest';

import {
  extractReplayId,
  isTimestampWithinTolerance,
  ReplayWindowStore,
} from '../src/utils/webhookSecurity';

describe('isTimestampWithinTolerance', () => {
  it('accepts timestamps within tolerance window', () => {
    const now = Date.parse('2026-07-04T12:00:00Z');
    expect(isTimestampWithinTolerance('2026-07-04T11:59:30Z', 60, now)).toBe(true);
  });

  it('rejects stale timestamps outside tolerance window', () => {
    const now = Date.parse('2026-07-04T12:00:00Z');
    expect(isTimestampWithinTolerance('2026-07-04T11:50:00Z', 60, now)).toBe(false);
  });

  it('rejects invalid timestamps', () => {
    expect(isTimestampWithinTolerance('not-a-date', 60)).toBe(false);
  });
});

describe('extractReplayId', () => {
  it('prefers requestId when available', () => {
    expect(extractReplayId({ requestId: 'req-001' })).toBe('req-001');
  });

  it('falls back to transactionId when requestId is missing', () => {
    expect(extractReplayId({ data: { transaction: { transactionId: 'txn-001' } } })).toBe('txn-001');
  });

  it('returns undefined when replay identifiers are missing', () => {
    expect(extractReplayId({})).toBeUndefined();
  });
});

describe('ReplayWindowStore', () => {
  it('rejects duplicate IDs within ttl window', () => {
    const store = new ReplayWindowStore();
    const now = Date.parse('2026-07-04T12:00:00Z');

    expect(store.registerOrReject('req-001', 300, now)).toBe(true);
    expect(store.registerOrReject('req-001', 300, now + 10_000)).toBe(false);
  });

  it('accepts same ID after ttl expiry', () => {
    const store = new ReplayWindowStore();
    const now = Date.parse('2026-07-04T12:00:00Z');

    expect(store.registerOrReject('req-001', 30, now)).toBe(true);
    expect(store.registerOrReject('req-001', 30, now + 31_000)).toBe(true);
  });
});
