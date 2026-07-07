import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';
import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  NOMBA_TRIGGER_EVENTS,
  NombaTrigger,
  normalizeNombaWebhookEvent,
} from '../src/nodes/NombaTrigger/NombaTrigger.node';

const SIGNING_KEY = 'NombaHackathon2026';

function paymentPayload(overrides: IDataObject = {}): IDataObject {
  return {
    event_type: 'payment_success',
    requestId: `req-${Math.random().toString(16).slice(2)}`,
    data: {
      merchant: {
        walletId: 'wallet-1',
        userId: 'user-1',
      },
      transaction: {
        transactionId: `txn-${Math.random().toString(16).slice(2)}`,
        type: 'checkout',
        time: new Date().toISOString(),
        responseCode: '',
        transactionAmount: 1000,
      },
    },
    ...overrides,
  };
}

function signPayload(body: IDataObject, timestamp: string, key = SIGNING_KEY): string {
  const data = body.data as IDataObject;
  const merchant = data.merchant as IDataObject;
  const transaction = data.transaction as IDataObject;
  const payload = [
    body.event_type,
    body.requestId,
    merchant.userId,
    merchant.walletId,
    transaction.transactionId,
    transaction.type,
    transaction.time,
    transaction.responseCode,
    timestamp,
  ].join(':');

  return createHmac('sha256', key).update(payload, 'utf8').digest('base64');
}

function createWebhookContext({
  body = paymentPayload(),
  headers = {},
  parameters = {},
  credentials = { webhookSigningKey: SIGNING_KEY },
}: {
  body?: IDataObject;
  headers?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
} = {}): {
  context: IWebhookFunctions;
  response: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  returnedItems: IDataObject[];
} {
  const response = {
    status: vi.fn(() => response),
    json: vi.fn(() => response),
  };
  const returnedItems: IDataObject[] = [];
  const context = {
    getRequestObject: vi.fn(() => ({})),
    getBodyData: vi.fn(() => body),
    getHeaderData: vi.fn(() => headers),
    getNodeParameter: vi.fn((name: string, fallback: unknown) =>
      Object.prototype.hasOwnProperty.call(parameters, name) ? parameters[name] : fallback,
    ),
    getCredentials: vi.fn(async () => credentials),
    getResponseObject: vi.fn(() => response),
    helpers: {
      returnJsonArray: vi.fn((items: IDataObject[]) => {
        returnedItems.push(...items);
        return items.map((json) => ({ json }));
      }),
    },
  } as unknown as IWebhookFunctions;

  return { context, response, returnedItems };
}

async function runWebhook(context: IWebhookFunctions) {
  return await new NombaTrigger().webhook!.call(context);
}

describe('Nomba Trigger event contract', () => {
  it('exposes all PRD trigger events', () => {
    expect(NOMBA_TRIGGER_EVENTS.map((event) => event.value)).toEqual([
      'payment_successful',
      'payment_failed',
      'refund_created',
      'refund_completed',
      'transfer_completed',
      'transfer_failed',
      'virtual_account_funded',
    ]);
  });

  it('normalizes checkout payment success events', () => {
    const normalized = normalizeNombaWebhookEvent({
      event_type: 'payment_success',
      data: {
        merchant: { userId: 'user-1' },
        transaction: {
          transactionId: 'txn-1',
          type: 'checkout',
        },
      },
    });

    expect(normalized.event).toEqual({
      type: 'payment_successful',
      rawType: 'payment_success',
    });
    expect(normalized.transaction).toMatchObject({ transactionId: 'txn-1' });
  });

  it('normalizes virtual account funding from vact payment success events', () => {
    const normalized = normalizeNombaWebhookEvent({
      event_type: 'payment_success',
      data: {
        transaction: {
          transactionId: 'txn-2',
          type: 'vact_transfer',
        },
      },
    });

    expect(normalized.event).toEqual({
      type: 'virtual_account_funded',
      rawType: 'payment_success',
    });
  });

  it('normalizes payout events as transfer events', () => {
    expect(
      normalizeNombaWebhookEvent({
        event_type: 'payout_success',
        data: { transaction: { transactionId: 'transfer-1' } },
      }).event,
    ).toEqual({
      type: 'transfer_completed',
      rawType: 'payout_success',
    });

    expect(
      normalizeNombaWebhookEvent({
        event_type: 'payout_failed',
        data: { transaction: { transactionId: 'transfer-2' } },
      }).event,
    ).toEqual({
      type: 'transfer_failed',
      rawType: 'payout_failed',
    });
  });

  it('normalizes refund events using transaction status when present', () => {
    expect(
      normalizeNombaWebhookEvent({
        event_type: 'refund',
        data: { transaction: { status: 'created' } },
      }).event,
    ).toEqual({
      type: 'refund_created',
      rawType: 'refund',
    });

    expect(
      normalizeNombaWebhookEvent({
        event_type: 'refund',
        data: { transaction: { status: 'completed' } },
      }).event,
    ).toEqual({
      type: 'refund_completed',
      rawType: 'refund',
    });
  });
});

describe('Nomba Trigger webhook execution', () => {
  it('emits normalized payloads when signature verification is disabled', async () => {
    const { context } = createWebhookContext({
      parameters: {
        verifySignature: false,
        events: ['payment_successful'],
      },
    });

    const result = await runWebhook(context);

    expect(result.workflowData?.[0][0].json).toMatchObject({
      event: {
        type: 'payment_successful',
        rawType: 'payment_success',
      },
      transaction: {
        type: 'checkout',
      },
    });
  });

  it('acknowledges but ignores filtered events', async () => {
    const { context } = createWebhookContext({
      parameters: {
        verifySignature: false,
        events: ['transfer_completed'],
      },
    });

    await expect(runWebhook(context)).resolves.toEqual({
      webhookResponse: { message: 'ignored' },
    });
  });

  it('accepts correctly signed events', async () => {
    const body = paymentPayload();
    const timestamp = new Date().toISOString();
    const { context } = createWebhookContext({
      body,
      headers: {
        'nomba-signature': signPayload(body, timestamp),
        'nomba-timestamp': timestamp,
      },
      parameters: {
        verifySignature: true,
        timestampToleranceSeconds: 300,
        enableReplayProtection: true,
        events: [],
      },
    });

    const result = await runWebhook(context);

    expect(result.workflowData?.[0][0].json).toMatchObject({
      event: {
        type: 'payment_successful',
      },
      raw: body,
    });
  });

  it('rejects stale timestamps before workflow emission', async () => {
    const body = paymentPayload();
    const staleTimestamp = '2020-01-01T00:00:00Z';
    const { context, response } = createWebhookContext({
      body,
      headers: {
        'nomba-signature': signPayload(body, staleTimestamp),
        'nomba-timestamp': staleTimestamp,
      },
      parameters: {
        verifySignature: true,
        timestampToleranceSeconds: 300,
        enableReplayProtection: true,
        events: [],
      },
    });

    await expect(runWebhook(context)).resolves.toEqual({ noWebhookResponse: true });
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ message: 'Invalid or stale nomba-timestamp header' });
  });

  it('requires a signing key when signature verification is enabled', async () => {
    const { context } = createWebhookContext({
      parameters: {
        verifySignature: true,
        events: [],
      },
      credentials: {},
    });

    await expect(runWebhook(context)).rejects.toThrow('Webhook signing key is not set.');
  });
});
