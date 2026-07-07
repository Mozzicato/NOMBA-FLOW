import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.fn();
const constructorMock = vi.fn();

vi.mock('../src/utils/httpClient', () => ({
  NombaHttpClient: class {
    request = requestMock;

    constructor(credentials: unknown) {
      constructorMock(credentials);
    }
  },
}));

import { Nomba } from '../src/nodes/Nomba/Nomba.node';

interface ExecuteContextOptions {
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  input?: INodeExecutionData[];
}

function createExecuteContext({
  parameters,
  credentials = {
    clientId: 'client-1',
    clientSecret: 'secret-1',
    accountId: 'parent-account-1',
    subAccountId: 'sub-account-1',
    environment: 'sandbox',
  },
  input = [{ json: { existing: true } }],
}: ExecuteContextOptions): IExecuteFunctions {
  return {
    getInputData: vi.fn(() => input),
    getCredentials: vi.fn(async () => credentials),
    getNodeParameter: vi.fn((name: string) => parameters[name]),
  } as unknown as IExecuteFunctions;
}

async function executeNode(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  return await new Nomba().execute.call(context);
}

describe('Nomba node execute', () => {
  beforeEach(() => {
    requestMock.mockReset();
    constructorMock.mockClear();
  });

  it('verifies payment using checkout identifier query params', async () => {
    requestMock.mockResolvedValueOnce({
      statusCode: 200,
      data: { status: 'PAYMENT_SUCCESSFUL', reference: 'ORD-001' },
    });

    const result = await executeNode(
      createExecuteContext({
        parameters: {
          resource: 'checkout',
          operation: 'verifyPayment',
          checkoutIdType: 'ORDER_REFERENCE',
          checkoutIdentifier: 'ORD-001',
        },
      }),
    );

    expect(constructorMock).toHaveBeenCalledWith({
      clientId: 'client-1',
      clientSecret: 'secret-1',
      accountId: 'parent-account-1',
      environment: 'sandbox',
    });
    expect(requestMock).toHaveBeenCalledWith('GET', '/v1/checkout/transaction', {
      query: {
        idType: 'ORDER_REFERENCE',
        id: 'ORD-001',
      },
    });
    expect(result[0][0].json).toMatchObject({
      existing: true,
      statusCode: 200,
      data: { status: 'PAYMENT_SUCCESSFUL', reference: 'ORD-001' },
      _nomba: {
        resource: 'checkout',
        operation: 'verifyPayment',
      },
    });
  });

  it('creates payment links with idempotency headers', async () => {
    requestMock.mockResolvedValueOnce({
      statusCode: 201,
      data: { checkoutLink: 'https://checkout.nomba.com/pay/abc' },
    });

    await executeNode(
      createExecuteContext({
        parameters: {
          resource: 'checkout',
          operation: 'createPaymentLink',
          checkoutAmount: 5000,
          checkoutCurrency: 'NGN',
          checkoutCustomerEmail: 'customer@example.com',
          checkoutCallbackUrl: 'https://example.com/callback',
          checkoutCustomerId: 'customer-1',
          checkoutIdentifier: 'INV-5000',
          checkoutTokenizeCard: true,
        },
      }),
    );

    expect(requestMock).toHaveBeenCalledWith(
      'POST',
      '/v1/checkout/order',
      expect.objectContaining({
        body: expect.objectContaining({
          order: expect.objectContaining({
            amount: 5000,
            currency: 'NGN',
            orderReference: 'INV-5000',
          }) as IDataObject,
        }) as IDataObject,
        headers: expect.objectContaining({
          'Idempotency-Key': 'inv-5000',
        }) as IDataObject,
      }),
    );
  });

  it('lists transactions using credential sub account and filters', async () => {
    requestMock.mockResolvedValueOnce({
      statusCode: 200,
      data: { items: [] },
    });

    await executeNode(
      createExecuteContext({
        parameters: {
          resource: 'transactions',
          operation: 'listTransactions',
          subAccountId: '',
          limit: 50,
          cursor: 'cursor-1',
          dateFrom: '2026-07-01T00:00:00Z',
          dateTo: '2026-07-31T23:59:59Z',
          status: 'PAYMENT_SUCCESSFUL',
        },
      }),
    );

    expect(requestMock).toHaveBeenCalledWith('GET', '/v1/transactions/accounts/sub-account-1', {
      query: {
        limit: 50,
        cursor: 'cursor-1',
        dateFrom: '2026-07-01T00:00:00Z',
        dateTo: '2026-07-31T23:59:59Z',
        status: 'PAYMENT_SUCCESSFUL',
      },
    });
  });

  it('initiates transfers using node-level sub account override', async () => {
    requestMock.mockResolvedValueOnce({
      statusCode: 200,
      data: { status: 'PENDING', merchantTxRef: 'TRF-001' },
    });

    await executeNode(
      createExecuteContext({
        parameters: {
          resource: 'transfers',
          operation: 'initiateTransfer',
          transferSubAccountId: 'override-sub-account',
          transferAmount: 2500,
          transferAccountNumber: '0123456789',
          transferAccountName: 'Test Recipient',
          transferBankCode: '058',
          transferMerchantTxRef: 'TRF-001',
          transferNarration: 'Vendor payout',
          transferSenderName: 'Nomba Flow',
        },
      }),
    );

    expect(requestMock).toHaveBeenCalledWith(
      'POST',
      '/v2/transfers/bank/override-sub-account',
      expect.objectContaining({
        body: expect.objectContaining({
          amount: 2500,
          accountNumber: '0123456789',
          merchantTxRef: 'TRF-001',
        }) as IDataObject,
        headers: expect.objectContaining({
          'Idempotency-Key': 'trf-001',
        }) as IDataObject,
      }),
    );
  });

  it('throws when transaction lookup has no identifier', async () => {
    await expect(
      executeNode(
        createExecuteContext({
          parameters: {
            resource: 'transactions',
            operation: 'getTransaction',
            subAccountId: '',
            transactionRef: '',
            merchantTxRef: '',
            orderReference: '',
            orderId: '',
          },
        }),
      ),
    ).rejects.toThrow(
      'Provide at least one of transaction reference, merchant transaction reference, order reference, or order ID.',
    );

    expect(requestMock).not.toHaveBeenCalled();
  });
});
