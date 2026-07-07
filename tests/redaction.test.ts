import { describe, expect, it } from 'vitest';

import { maskSecret, redactHeaders } from '../src/utils/redaction';

describe('maskSecret', () => {
  it('masks middle characters for long secrets', () => {
    expect(maskSecret('sk_live_1234567890')).toBe('sk_l**********7890');
  });

  it('fully masks short secrets', () => {
    expect(maskSecret('abcd')).toBe('****');
  });
});

describe('redactHeaders', () => {
  it('redacts sensitive headers and keeps non-sensitive values', () => {
    const result = redactHeaders({
      Authorization: 'Bearer super-secret-token',
      'x-api-key': 'abc12345',
      'content-type': 'application/json',
    });

    expect(result.Authorization).not.toContain('super-secret-token');
    expect(result['x-api-key']).not.toBe('abc12345');
    expect(result['content-type']).toBe('application/json');
  });
});
