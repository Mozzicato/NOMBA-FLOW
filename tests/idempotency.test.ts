import { describe, expect, it } from 'vitest';

import { buildIdempotencyKey, normalizeReference } from '../src/utils/idempotency';

describe('normalizeReference', () => {
  it('normalizes case and trims spaces', () => {
    expect(normalizeReference('  AbC-123  ')).toBe('abc-123');
  });
});

describe('buildIdempotencyKey', () => {
  it('reuses a provided reference', () => {
    expect(buildIdempotencyKey('  REF-XYZ  ')).toBe('ref-xyz');
  });

  it('generates a UUID when reference is missing', () => {
    const key = buildIdempotencyKey();
    expect(key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
