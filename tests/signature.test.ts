import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  buildSigningPayload,
  computeSignature,
  extractSignatureFields,
  signaturesMatch,
  verifyWebhookSignature,
  verifyWebhookSignatureWithAnyKey,
} from '../src/utils/signature';

const SIGNING_KEY = 'NombaHackathon2026';
const TIMESTAMP = '2026-02-06T10:21:57Z';

// Mirrors the example payload from https://developer.nomba.com/docs/api-basics/webhook
const examplePayload = {
  event_type: 'payment_success',
  requestId: '49e11b44-909b-4f83-82b4-9a83a000000',
  data: {
    merchant: {
      walletId: '693e907aad9ea59616AAAA',
      walletBalance: 539.4,
      userId: '613bb620-c8e5-45f6-9c00-111111111111',
    },
    transaction: {
      transactionId: 'API-VACT_TRA-613BB-eeae578a-cdd4-459c-8bd5-222222',
      type: 'vact_transfer',
      time: '2026-02-06T10:21:56Z',
      responseCode: '',
      transactionAmount: 120,
      fee: 0.6,
    },
  },
};

function sign(body: unknown, key = SIGNING_KEY, timestamp = TIMESTAMP): string {
  const payload = buildSigningPayload(extractSignatureFields(body, timestamp));
  return createHmac('sha256', key).update(payload, 'utf8').digest('base64');
}

describe('extractSignatureFields', () => {
  it('maps the documented JSON paths, defaulting blanks to empty strings', () => {
    const fields = extractSignatureFields(examplePayload, TIMESTAMP);

    expect(fields).toEqual({
      eventType: 'payment_success',
      requestId: '49e11b44-909b-4f83-82b4-9a83a000000',
      userId: '613bb620-c8e5-45f6-9c00-111111111111',
      walletId: '693e907aad9ea59616AAAA',
      transactionId: 'API-VACT_TRA-613BB-eeae578a-cdd4-459c-8bd5-222222',
      transactionType: 'vact_transfer',
      transactionTime: '2026-02-06T10:21:56Z',
      responseCode: '',
      timestamp: TIMESTAMP,
    });
  });

  it('tolerates a missing data object', () => {
    const fields = extractSignatureFields({ event_type: 'x', requestId: 'y' }, TIMESTAMP);
    expect(fields.userId).toBe('');
    expect(fields.transactionId).toBe('');
  });
});

describe('buildSigningPayload', () => {
  it('joins the nine fields with colons in order', () => {
    const payload = buildSigningPayload(extractSignatureFields(examplePayload, TIMESTAMP));
    expect(payload).toBe(
      [
        'payment_success',
        '49e11b44-909b-4f83-82b4-9a83a000000',
        '613bb620-c8e5-45f6-9c00-111111111111',
        '693e907aad9ea59616AAAA',
        'API-VACT_TRA-613BB-eeae578a-cdd4-459c-8bd5-222222',
        'vact_transfer',
        '2026-02-06T10:21:56Z',
        '',
        TIMESTAMP,
      ].join(':'),
    );
  });
});

describe('verifyWebhookSignature', () => {
  it('accepts a correctly signed payload', () => {
    const signature = sign(examplePayload);
    expect(verifyWebhookSignature(examplePayload, SIGNING_KEY, signature, TIMESTAMP)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const signature = sign(examplePayload);
    const tampered = {
      ...examplePayload,
      data: {
        ...examplePayload.data,
        transaction: { ...examplePayload.data.transaction, transactionAmount: 999999 },
      },
    };
    // Amount is not part of the signed fields, so this still matches...
    expect(verifyWebhookSignature(tampered, SIGNING_KEY, signature, TIMESTAMP)).toBe(true);

    // ...but changing a signed field (transactionId) must fail.
    const tamperedSigned = {
      ...examplePayload,
      data: {
        ...examplePayload.data,
        transaction: { ...examplePayload.data.transaction, transactionId: 'evil' },
      },
    };
    expect(verifyWebhookSignature(tamperedSigned, SIGNING_KEY, signature, TIMESTAMP)).toBe(false);
  });

  it('rejects a signature made with the wrong key', () => {
    const signature = sign(examplePayload, 'wrong-key');
    expect(verifyWebhookSignature(examplePayload, SIGNING_KEY, signature, TIMESTAMP)).toBe(false);
  });

  it('rejects when the timestamp header differs from the signed one', () => {
    const signature = sign(examplePayload);
    expect(verifyWebhookSignature(examplePayload, SIGNING_KEY, signature, 'different')).toBe(false);
  });

  it('returns false when the signing key or signature is missing', () => {
    const signature = sign(examplePayload);
    expect(verifyWebhookSignature(examplePayload, '', signature, TIMESTAMP)).toBe(false);
    expect(verifyWebhookSignature(examplePayload, SIGNING_KEY, undefined, TIMESTAMP)).toBe(false);
  });
});

describe('signaturesMatch', () => {
  it('returns false for differing lengths without throwing', () => {
    expect(signaturesMatch('abc', 'abcd')).toBe(false);
  });

  it('matches identical signatures', () => {
    const sig = computeSignature(SIGNING_KEY, 'a:b:c');
    expect(signaturesMatch(sig, sig)).toBe(true);
  });
});

describe('verifyWebhookSignatureWithAnyKey', () => {
  it('accepts when any key in rotation list matches', () => {
    const signature = sign(examplePayload, 'rotated-key');
    expect(
      verifyWebhookSignatureWithAnyKey(examplePayload, ['old-key', 'rotated-key'], signature, TIMESTAMP),
    ).toBe(true);
  });

  it('rejects when none of the keys match', () => {
    const signature = sign(examplePayload, 'different-key');
    expect(
      verifyWebhookSignatureWithAnyKey(examplePayload, ['old-key', 'rotated-key'], signature, TIMESTAMP),
    ).toBe(false);
  });
});
