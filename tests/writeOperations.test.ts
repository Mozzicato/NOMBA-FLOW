import { describe, expect, it } from 'vitest';

import {
  buildCreatePaymentLinkRequest,
  buildCreateRefundRequest,
  buildCreateVirtualAccountRequest,
  buildInitiateTransferRequest,
} from '../src/nodes/Nomba/writeOperations';

describe('buildCreatePaymentLinkRequest', () => {
  it('builds payload and idempotency header', () => {
    const request = buildCreatePaymentLinkRequest({
      amount: 1000,
      currency: 'NGN',
      customerEmail: 'dev@nomba.flow',
      callbackUrl: 'https://example.com/callback',
      orderReference: 'INV-1001',
      tokenizeCard: true,
    });

    expect(request.body.order).toBeDefined();
    expect(request.headers['Idempotency-Key']).toBe('inv-1001');
  });

  it('throws for invalid amount', () => {
    expect(() =>
      buildCreatePaymentLinkRequest({
        amount: 0,
        currency: 'NGN',
        customerEmail: 'dev@nomba.flow',
        callbackUrl: 'https://example.com/callback',
      }),
    ).toThrow('Amount must be greater than zero.');
  });
});

describe('buildCreateRefundRequest', () => {
  it('builds minimal refund payload', () => {
    const request = buildCreateRefundRequest({
      transactionId: 'TXN-001',
    });

    expect(request.body.transactionId).toBe('TXN-001');
    expect(request.headers['Idempotency-Key']).toBe('txn-001');
  });
});

describe('buildInitiateTransferRequest', () => {
  it('builds transfer payload and reuses merchant reference as idempotency key', () => {
    const request = buildInitiateTransferRequest({
      amount: 2500,
      accountNumber: '0123456789',
      accountName: 'Mubarak Salaudeen',
      bankCode: '058',
      merchantTxRef: 'UNQ_123abGGhh5546',
    });

    expect(request.body.amount).toBe(2500);
    expect(request.body.accountNumber).toBe('0123456789');
    expect(request.headers['Idempotency-Key']).toBe('unq_123abgghh5546');
  });
});

describe('buildCreateVirtualAccountRequest', () => {
  it('uses parent endpoint by default', () => {
    const request = buildCreateVirtualAccountRequest({
      accountRef: 'VA-REF-001',
      accountName: 'Nomba Flow Test',
    });

    expect(request.path).toBe('/v1/accounts/virtual');
    expect(request.headers['Idempotency-Key']).toBe('va-ref-001');
  });

  it('uses sub account endpoint when provided', () => {
    const request = buildCreateVirtualAccountRequest({
      accountRef: 'VA-REF-002',
      accountName: 'Nomba Flow Sub',
      subAccountId: 'c3e673d2-8855-494a-9c48-f4d2b92f8db2',
    });

    expect(request.path).toContain('/v1/accounts/virtual/c3e673d2-8855-494a-9c48-f4d2b92f8db2');
  });
});
