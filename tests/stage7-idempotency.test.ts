import { describe, expect, it } from 'vitest';

import { buildIdempotencyKey } from '../src/utils/idempotency';
import {
  buildCreatePaymentLinkRequest,
  buildCreateRefundRequest,
  buildCreateVirtualAccountRequest,
  buildInitiateTransferRequest,
} from '../src/nodes/Nomba/writeOperations';

describe('Stage 7: Idempotency Safety', () => {
  describe('write operations include idempotency headers', () => {
    it('create payment link includes idempotency-key', () => {
      const request = buildCreatePaymentLinkRequest({
        amount: 1000,
        currency: 'NGN',
        customerEmail: 'test@example.com',
        callbackUrl: 'https://example.com/callback',
        orderReference: 'unique-order-ref-123',
      });

      expect(request.headers['Idempotency-Key']).toBeDefined();
      expect(request.headers['Idempotency-Key']).toMatch(/[a-z0-9\-]/i);
    });

    it('create refund includes idempotency-key', () => {
      const request = buildCreateRefundRequest({
        transactionId: 'txn-001',
        amount: 500,
      });

      expect(request.headers['Idempotency-Key']).toBeDefined();
    });

    it('initiate transfer includes idempotency-key', () => {
      const request = buildInitiateTransferRequest({
        amount: 2500,
        accountNumber: '0123456789',
        accountName: 'Test User',
        bankCode: '058',
        merchantTxRef: 'unique-transfer-ref',
      });

      expect(request.headers['Idempotency-Key']).toBeDefined();
    });

    it('create virtual account includes idempotency-key', () => {
      const request = buildCreateVirtualAccountRequest({
        accountRef: 'unique-va-ref',
        accountName: 'Test Account',
      });

      expect(request.headers['Idempotency-Key']).toBeDefined();
    });
  });

  describe('idempotency key consistency', () => {
    it('same reference produces same key', () => {
      const ref = 'stable-reference-123';
      const key1 = buildIdempotencyKey(ref);
      const key2 = buildIdempotencyKey(ref);

      expect(key1).toBe(key2);
    });

    it('different references produce different keys', () => {
      const key1 = buildIdempotencyKey('ref-1');
      const key2 = buildIdempotencyKey('ref-2');

      expect(key1).not.toBe(key2);
    });
  });

  describe('field validation prevents invalid payloads', () => {
    it('rejects zero/negative amounts', () => {
      expect(() =>
        buildCreatePaymentLinkRequest({
          amount: 0,
          currency: 'NGN',
          customerEmail: 'test@example.com',
          callbackUrl: 'https://example.com/callback',
        }),
      ).toThrow();
    });

    it('rejects missing customer email', () => {
      expect(() =>
        buildCreatePaymentLinkRequest({
          amount: 1000,
          currency: 'NGN',
          customerEmail: '',
          callbackUrl: 'https://example.com/callback',
        }),
      ).toThrow();
    });

    it('rejects missing transfer fields', () => {
      expect(() =>
        buildInitiateTransferRequest({
          amount: 1000,
          accountNumber: '',
          accountName: 'Test',
          bankCode: '058',
          merchantTxRef: 'ref',
        }),
      ).toThrow();
    });
  });
});
