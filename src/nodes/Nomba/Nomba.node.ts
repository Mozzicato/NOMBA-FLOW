import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

import { NombaHttpClient, type NombaEnvironment } from '../../utils/httpClient';
import {
  buildCreatePaymentLinkRequest,
  buildCreateRefundRequest,
  buildCreateVirtualAccountRequest,
  buildInitiateTransferRequest,
} from './writeOperations';

interface NodeCredentials {
  clientId: string;
  clientSecret: string;
  accountId: string;
  subAccountId?: string;
  environment: NombaEnvironment;
}

function optionalStringParam(executeContext: IExecuteFunctions, parameter: string, itemIndex: number): string | undefined {
  const value = (executeContext.getNodeParameter(parameter, itemIndex) as string).trim();
  return value.length > 0 ? value : undefined;
}

function buildPaginationQuery(executeContext: IExecuteFunctions, itemIndex: number): Record<string, string | number> {
  const limit = executeContext.getNodeParameter('limit', itemIndex) as number;
  const cursor = optionalStringParam(executeContext, 'cursor', itemIndex);
  const dateFrom = optionalStringParam(executeContext, 'dateFrom', itemIndex);
  const dateTo = optionalStringParam(executeContext, 'dateTo', itemIndex);

  const query: Record<string, string | number> = { limit };
  if (cursor) {
    query.cursor = cursor;
  }
  if (dateFrom) {
    query.dateFrom = dateFrom;
  }
  if (dateTo) {
    query.dateTo = dateTo;
  }

  return query;
}

function buildTransactionQuery(executeContext: IExecuteFunctions, itemIndex: number): Record<string, string> {
  const transactionRef = optionalStringParam(executeContext, 'transactionRef', itemIndex);
  const merchantTxRef = optionalStringParam(executeContext, 'merchantTxRef', itemIndex);
  const orderReference = optionalStringParam(executeContext, 'orderReference', itemIndex);
  const orderId = optionalStringParam(executeContext, 'orderId', itemIndex);

  const query: Record<string, string> = {};
  if (transactionRef) {
    query.transactionRef = transactionRef;
  }
  if (merchantTxRef) {
    query.merchantTxRef = merchantTxRef;
  }
  if (orderReference) {
    query.orderReference = orderReference;
  }
  if (orderId) {
    query.orderId = orderId;
  }

  return query;
}

function resolveSubAccountId(
  executeContext: IExecuteFunctions,
  itemIndex: number,
  credentials: NodeCredentials,
): string {
  const overrideValue = (executeContext.getNodeParameter('subAccountId', itemIndex) as string).trim();
  if (overrideValue) {
    return overrideValue;
  }

  const fromCredentials = (credentials.subAccountId ?? '').trim();
  if (fromCredentials) {
    return fromCredentials;
  }

  throw new Error('Sub Account ID is required for transaction operations. Set it in credentials or node parameters.');
}

export class Nomba implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Nomba',
    name: 'nomba',
    icon: 'file:nomba.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: 'Automate Nomba payment workflows inside n8n.',
    defaults: {
      name: 'Nomba',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'nombaApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Checkout',
            value: 'checkout',
          },
          {
            name: 'Transactions',
            value: 'transactions',
          },
          {
            name: 'Transfers',
            value: 'transfers',
          },
          {
            name: 'Refunds',
            value: 'refunds',
          },
          {
            name: 'Virtual Accounts',
            value: 'virtualAccounts',
          },
        ],
        default: 'checkout',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Create Payment Link',
            value: 'createPaymentLink',
            description: 'Create an online checkout order and return the payment link.',
            displayOptions: {
              show: {
                resource: ['checkout'],
              },
            },
          },
          {
            name: 'Verify Payment',
            value: 'verifyPayment',
            description: 'Fetch checkout transaction status by order reference or order ID.',
            displayOptions: {
              show: {
                resource: ['checkout'],
              },
            },
          },
          {
            name: 'Get Transaction',
            value: 'getTransaction',
            description: 'Fetch a single transaction on a sub account.',
            displayOptions: {
              show: {
                resource: ['transactions'],
              },
            },
          },
          {
            name: 'List Transactions',
            value: 'listTransactions',
            description: 'Fetch transactions on a sub account with pagination and date filters.',
            displayOptions: {
              show: {
                resource: ['transactions'],
              },
            },
          },
          {
            name: 'Search Transactions',
            value: 'searchTransactions',
            description: 'Filter transactions by reference or status on a sub account.',
            displayOptions: {
              show: {
                resource: ['transactions'],
              },
            },
          },
          {
            name: 'Create Refund',
            value: 'createRefund',
            description: 'Create a checkout refund for a transaction.',
            displayOptions: {
              show: {
                resource: ['refunds'],
              },
            },
          },
          {
            name: 'Initiate Transfer',
            value: 'initiateTransfer',
            description: 'Initiate bank transfer from a sub account.',
            displayOptions: {
              show: {
                resource: ['transfers'],
              },
            },
          },
          {
            name: 'Verify Transfer',
            value: 'verifyTransfer',
            description: 'Verify transfer status using session ID.',
            displayOptions: {
              show: {
                resource: ['transfers'],
              },
            },
          },
          {
            name: 'Create Virtual Account',
            value: 'createVirtualAccount',
            description: 'Create a virtual account on parent or sub account scope.',
            displayOptions: {
              show: {
                resource: ['virtualAccounts'],
              },
            },
          },
          {
            name: 'Get Virtual Account',
            value: 'getVirtualAccount',
            description: 'Fetch a virtual account by identifier.',
            displayOptions: {
              show: {
                resource: ['virtualAccounts'],
              },
            },
          },
        ],
        default: 'verifyPayment',
      },
      {
        displayName: 'Identifier Type',
        name: 'checkoutIdType',
        type: 'options',
        options: [
          {
            name: 'Order Reference',
            value: 'ORDER_REFERENCE',
          },
          {
            name: 'Order ID',
            value: 'ORDER_ID',
          },
        ],
        default: 'ORDER_REFERENCE',
        displayOptions: {
          show: {
            resource: ['checkout'],
            operation: ['verifyPayment', 'createPaymentLink'],
          },
        },
      },
      {
        displayName: 'Identifier',
        name: 'checkoutIdentifier',
        type: 'string',
        required: true,
        default: '',
        description: 'Order reference or order ID based on the selected identifier type.',
        displayOptions: {
          show: {
            resource: ['checkout'],
            operation: ['verifyPayment'],
          },
        },
      },
      {
        displayName: 'Amount',
        name: 'checkoutAmount',
        type: 'number',
        default: 1000,
        required: true,
        displayOptions: {
          show: {
            resource: ['checkout'],
            operation: ['createPaymentLink'],
          },
        },
      },
      {
        displayName: 'Currency',
        name: 'checkoutCurrency',
        type: 'options',
        default: 'NGN',
        options: [
          { name: 'NGN', value: 'NGN' },
          { name: 'CDF', value: 'CDF' },
          { name: 'USD', value: 'USD' },
        ],
        displayOptions: {
          show: {
            resource: ['checkout'],
            operation: ['createPaymentLink'],
          },
        },
      },
      {
        displayName: 'Customer Email',
        name: 'checkoutCustomerEmail',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['checkout'],
            operation: ['createPaymentLink'],
          },
        },
      },
      {
        displayName: 'Callback URL',
        name: 'checkoutCallbackUrl',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['checkout'],
            operation: ['createPaymentLink'],
          },
        },
      },
      {
        displayName: 'Customer ID',
        name: 'checkoutCustomerId',
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
          show: {
            resource: ['checkout'],
            operation: ['createPaymentLink'],
          },
        },
      },
      {
        displayName: 'Tokenize Card',
        name: 'checkoutTokenizeCard',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            resource: ['checkout'],
            operation: ['createPaymentLink'],
          },
        },
      },
      {
        displayName: 'Refund Transaction ID',
        name: 'refundTransactionId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['refunds'],
            operation: ['createRefund'],
          },
        },
      },
      {
        displayName: 'Refund Amount',
        name: 'refundAmount',
        type: 'number',
        default: 0,
        required: false,
        displayOptions: {
          show: {
            resource: ['refunds'],
            operation: ['createRefund'],
          },
        },
      },
      {
        displayName: 'Refund Account Number',
        name: 'refundAccountNumber',
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
          show: {
            resource: ['refunds'],
            operation: ['createRefund'],
          },
        },
      },
      {
        displayName: 'Refund Bank Code',
        name: 'refundBankCode',
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
          show: {
            resource: ['refunds'],
            operation: ['createRefund'],
          },
        },
      },
      {
        displayName: 'Transfer Sub Account ID',
        name: 'transferSubAccountId',
        type: 'string',
        default: '',
        required: false,
        description: 'Overrides credential sub account for transfer operations.',
        displayOptions: {
          show: {
            resource: ['transfers'],
            operation: ['initiateTransfer'],
          },
        },
      },
      {
        displayName: 'Transfer Amount',
        name: 'transferAmount',
        type: 'number',
        default: 1000,
        required: true,
        displayOptions: {
          show: {
            resource: ['transfers'],
            operation: ['initiateTransfer'],
          },
        },
      },
      {
        displayName: 'Recipient Account Number',
        name: 'transferAccountNumber',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['transfers'],
            operation: ['initiateTransfer'],
          },
        },
      },
      {
        displayName: 'Recipient Account Name',
        name: 'transferAccountName',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['transfers'],
            operation: ['initiateTransfer'],
          },
        },
      },
      {
        displayName: 'Bank Code',
        name: 'transferBankCode',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['transfers'],
            operation: ['initiateTransfer'],
          },
        },
      },
      {
        displayName: 'Merchant Transaction Reference',
        name: 'transferMerchantTxRef',
        type: 'string',
        default: '',
        required: true,
        description: 'Idempotency reference for transfer requests.',
        displayOptions: {
          show: {
            resource: ['transfers'],
            operation: ['initiateTransfer'],
          },
        },
      },
      {
        displayName: 'Narration',
        name: 'transferNarration',
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
          show: {
            resource: ['transfers'],
            operation: ['initiateTransfer'],
          },
        },
      },
      {
        displayName: 'Sender Name',
        name: 'transferSenderName',
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
          show: {
            resource: ['transfers'],
            operation: ['initiateTransfer'],
          },
        },
      },
      {
        displayName: 'Session ID',
        name: 'transferSessionId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['transfers'],
            operation: ['verifyTransfer'],
          },
        },
      },
      {
        displayName: 'Create For Sub Account',
        name: 'virtualCreateForSubAccount',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            resource: ['virtualAccounts'],
            operation: ['createVirtualAccount'],
          },
        },
      },
      {
        displayName: 'Virtual Account Sub Account ID',
        name: 'virtualSubAccountId',
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
          show: {
            resource: ['virtualAccounts'],
            operation: ['createVirtualAccount'],
            virtualCreateForSubAccount: [true],
          },
        },
      },
      {
        displayName: 'Virtual Account Reference',
        name: 'virtualAccountRef',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: {
            resource: ['virtualAccounts'],
            operation: ['createVirtualAccount'],
          },
        },
      },
      {
        displayName: 'Virtual Account Name',
        name: 'virtualAccountName',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: {
            resource: ['virtualAccounts'],
            operation: ['createVirtualAccount'],
          },
        },
      },
      {
        displayName: 'BVN',
        name: 'virtualBvn',
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
          show: {
            resource: ['virtualAccounts'],
            operation: ['createVirtualAccount'],
          },
        },
      },
      {
        displayName: 'Expiry Date',
        name: 'virtualExpiryDate',
        type: 'string',
        default: '',
        required: false,
        placeholder: '2026-01-30 12:15:00',
        displayOptions: {
          show: {
            resource: ['virtualAccounts'],
            operation: ['createVirtualAccount'],
          },
        },
      },
      {
        displayName: 'Expected Amount',
        name: 'virtualExpectedAmount',
        type: 'number',
        default: 0,
        required: false,
        displayOptions: {
          show: {
            resource: ['virtualAccounts'],
            operation: ['createVirtualAccount'],
          },
        },
      },
      {
        displayName: 'Sub Account ID',
        name: 'subAccountId',
        type: 'string',
        required: false,
        default: '',
        description: 'Overrides the credential default sub account for this execution.',
        displayOptions: {
          show: {
            resource: ['transactions'],
          },
        },
      },
      {
        displayName: 'Transaction Reference',
        name: 'transactionRef',
        type: 'string',
        required: false,
        default: '',
        displayOptions: {
          show: {
            resource: ['transactions'],
            operation: ['getTransaction', 'searchTransactions'],
          },
        },
      },
      {
        displayName: 'Merchant Transaction Reference',
        name: 'merchantTxRef',
        type: 'string',
        required: false,
        default: '',
        displayOptions: {
          show: {
            resource: ['transactions'],
            operation: ['getTransaction', 'searchTransactions'],
          },
        },
      },
      {
        displayName: 'Order Reference',
        name: 'orderReference',
        type: 'string',
        required: false,
        default: '',
        displayOptions: {
          show: {
            resource: ['transactions'],
            operation: ['getTransaction', 'searchTransactions'],
          },
        },
      },
      {
        displayName: 'Order ID',
        name: 'orderId',
        type: 'string',
        required: false,
        default: '',
        displayOptions: {
          show: {
            resource: ['transactions'],
            operation: ['getTransaction', 'searchTransactions'],
          },
        },
      },
      {
        displayName: 'Status',
        name: 'status',
        type: 'options',
        required: false,
        default: '',
        options: [
          { name: 'NEW', value: 'NEW' },
          { name: 'PENDING_PAYMENT', value: 'PENDING_PAYMENT' },
          { name: 'PAYMENT_SUCCESSFUL', value: 'PAYMENT_SUCCESSFUL' },
          { name: 'PAYMENT_FAILED', value: 'PAYMENT_FAILED' },
          { name: 'PENDING_BILLING', value: 'PENDING_BILLING' },
          { name: 'SUCCESS', value: 'SUCCESS' },
          { name: 'REFUND', value: 'REFUND' },
        ],
        displayOptions: {
          show: {
            resource: ['transactions'],
            operation: ['searchTransactions', 'listTransactions'],
          },
        },
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: {
          minValue: 1,
        },
        default: 20,
        displayOptions: {
          show: {
            resource: ['transactions'],
            operation: ['listTransactions', 'searchTransactions'],
          },
        },
      },
      {
        displayName: 'Cursor',
        name: 'cursor',
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
          show: {
            resource: ['transactions'],
            operation: ['listTransactions', 'searchTransactions'],
          },
        },
      },
      {
        displayName: 'Date From',
        name: 'dateFrom',
        type: 'string',
        default: '',
        required: false,
        placeholder: '2026-07-01T00:00:00Z',
        displayOptions: {
          show: {
            resource: ['transactions'],
            operation: ['listTransactions', 'searchTransactions'],
          },
        },
      },
      {
        displayName: 'Date To',
        name: 'dateTo',
        type: 'string',
        default: '',
        required: false,
        placeholder: '2026-07-31T23:59:59Z',
        displayOptions: {
          show: {
            resource: ['transactions'],
            operation: ['listTransactions', 'searchTransactions'],
          },
        },
      },
      {
        displayName: 'Virtual Account Identifier',
        name: 'virtualAccountIdentifier',
        type: 'string',
        required: true,
        default: '',
        description: 'Virtual account identifier returned at creation time.',
        displayOptions: {
          show: {
            resource: ['virtualAccounts'],
            operation: ['getVirtualAccount'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const inputData = this.getInputData();

    const credentials = (await this.getCredentials('nombaApi')) as unknown as NodeCredentials;
    const client = new NombaHttpClient({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      accountId: credentials.accountId,
      environment: credentials.environment,
    });

    const outputData: INodeExecutionData[] = [];

    for (let i = 0; i < inputData.length; i += 1) {
      const resource = this.getNodeParameter('resource', i) as string;
      const operation = this.getNodeParameter('operation', i) as string;

      let result: IDataObject;

      if (resource === 'checkout' && operation === 'createPaymentLink') {
        const checkoutIdentifier = optionalStringParam(this, 'checkoutIdentifier', i);
        const request = buildCreatePaymentLinkRequest({
          amount: this.getNodeParameter('checkoutAmount', i) as number,
          currency: this.getNodeParameter('checkoutCurrency', i) as 'NGN' | 'CDF' | 'USD',
          customerEmail: this.getNodeParameter('checkoutCustomerEmail', i) as string,
          callbackUrl: this.getNodeParameter('checkoutCallbackUrl', i) as string,
          customerId: this.getNodeParameter('checkoutCustomerId', i) as string,
          orderReference: checkoutIdentifier,
          tokenizeCard: this.getNodeParameter('checkoutTokenizeCard', i) as boolean,
        });

        const response = await client.request<IDataObject>('POST', '/v1/checkout/order', {
          body: request.body,
          headers: request.headers,
        });

        result = {
          statusCode: response.statusCode,
          data: response.data,
        };
      } else if (resource === 'checkout' && operation === 'verifyPayment') {
        const idType = this.getNodeParameter('checkoutIdType', i) as string;
        const id = this.getNodeParameter('checkoutIdentifier', i) as string;

        const response = await client.request<IDataObject>('GET', '/v1/checkout/transaction', {
          query: {
            idType,
            id,
          },
        });

        result = {
          statusCode: response.statusCode,
          data: response.data,
        };
      } else if (resource === 'transactions' && operation === 'getTransaction') {
        const subAccountId = resolveSubAccountId(this, i, credentials);
        const query = buildTransactionQuery(this, i);

        if (Object.keys(query).length === 0) {
          throw new Error(
            'Provide at least one of transaction reference, merchant transaction reference, order reference, or order ID.',
          );
        }

        const response = await client.request<IDataObject>(
          'GET',
          `/v1/transactions/accounts/${encodeURIComponent(subAccountId)}/single`,
          {
            query,
          },
        );

        result = {
          statusCode: response.statusCode,
          data: response.data,
        };
      } else if (resource === 'transactions' && operation === 'listTransactions') {
        const subAccountId = resolveSubAccountId(this, i, credentials);
        const query = buildPaginationQuery(this, i);
        const status = optionalStringParam(this, 'status', i);
        if (status) {
          query.status = status;
        }

        const response = await client.request<IDataObject>(
          'GET',
          `/v1/transactions/accounts/${encodeURIComponent(subAccountId)}`,
          {
            query,
          },
        );

        result = {
          statusCode: response.statusCode,
          data: response.data,
        };
      } else if (resource === 'transactions' && operation === 'searchTransactions') {
        const subAccountId = resolveSubAccountId(this, i, credentials);
        const query = buildPaginationQuery(this, i);
        const body = buildTransactionQuery(this, i);
        const status = optionalStringParam(this, 'status', i);

        if (status) {
          body.status = status;
        }

        if (Object.keys(body).length === 0) {
          throw new Error(
            'Provide at least one search filter: transaction reference, merchant reference, order reference, order ID, or status.',
          );
        }

        const response = await client.request<IDataObject>(
          'POST',
          `/v1/transactions/accounts/${encodeURIComponent(subAccountId)}`,
          {
            query,
            body,
          },
        );

        result = {
          statusCode: response.statusCode,
          data: response.data,
        };
      } else if (resource === 'virtualAccounts' && operation === 'getVirtualAccount') {
        const identifier = this.getNodeParameter('virtualAccountIdentifier', i) as string;

        const response = await client.request<IDataObject>(
          'GET',
          `/v1/accounts/virtual/${encodeURIComponent(identifier)}`,
        );

        result = {
          statusCode: response.statusCode,
          data: response.data,
        };
      } else if (resource === 'refunds' && operation === 'createRefund') {
        const amount = this.getNodeParameter('refundAmount', i) as number;

        const request = buildCreateRefundRequest({
          transactionId: this.getNodeParameter('refundTransactionId', i) as string,
          amount: amount > 0 ? amount : undefined,
          accountNumber: this.getNodeParameter('refundAccountNumber', i) as string,
          bankCode: this.getNodeParameter('refundBankCode', i) as string,
        });

        const response = await client.request<IDataObject>('POST', '/v1/checkout/refund', {
          body: request.body,
          headers: request.headers,
        });

        result = {
          statusCode: response.statusCode,
          data: response.data,
        };
      } else if (resource === 'transfers' && operation === 'initiateTransfer') {
        const subAccountId =
          optionalStringParam(this, 'transferSubAccountId', i) ?? resolveSubAccountId(this, i, credentials);

        const request = buildInitiateTransferRequest({
          amount: this.getNodeParameter('transferAmount', i) as number,
          accountNumber: this.getNodeParameter('transferAccountNumber', i) as string,
          accountName: this.getNodeParameter('transferAccountName', i) as string,
          bankCode: this.getNodeParameter('transferBankCode', i) as string,
          merchantTxRef: this.getNodeParameter('transferMerchantTxRef', i) as string,
          narration: this.getNodeParameter('transferNarration', i) as string,
          senderName: this.getNodeParameter('transferSenderName', i) as string,
        });

        const response = await client.request<IDataObject>(
          'POST',
          `/v2/transfers/bank/${encodeURIComponent(subAccountId)}`,
          {
            body: request.body,
            headers: request.headers,
          },
        );

        result = {
          statusCode: response.statusCode,
          data: response.data,
        };
      } else if (resource === 'transfers' && operation === 'verifyTransfer') {
        const sessionId = this.getNodeParameter('transferSessionId', i) as string;

        const response = await client.request<IDataObject>(
          'GET',
          `/v1/transactions/requery/${encodeURIComponent(sessionId)}`,
        );

        result = {
          statusCode: response.statusCode,
          data: response.data,
        };
      } else if (resource === 'virtualAccounts' && operation === 'createVirtualAccount') {
        const createForSubAccount = this.getNodeParameter('virtualCreateForSubAccount', i) as boolean;
        const request = buildCreateVirtualAccountRequest({
          accountRef: this.getNodeParameter('virtualAccountRef', i) as string,
          accountName: this.getNodeParameter('virtualAccountName', i) as string,
          bvn: this.getNodeParameter('virtualBvn', i) as string,
          expiryDate: this.getNodeParameter('virtualExpiryDate', i) as string,
          expectedAmount:
            (this.getNodeParameter('virtualExpectedAmount', i) as number) > 0
              ? (this.getNodeParameter('virtualExpectedAmount', i) as number)
              : undefined,
          subAccountId: createForSubAccount
            ? (this.getNodeParameter('virtualSubAccountId', i) as string)
            : undefined,
        });

        const response = await client.request<IDataObject>('POST', request.path, {
          body: request.body,
          headers: request.headers,
        });

        result = {
          statusCode: response.statusCode,
          data: response.data,
        };
      } else {
        throw new Error(`Unsupported operation: ${resource}.${operation}`);
      }

      outputData.push({
        json: {
          ...inputData[i].json,
          ...result,
          _nomba: {
            resource,
            operation,
          },
        },
        pairedItem: {
          item: i,
        },
      });
    }

    return [outputData];
  }
}
