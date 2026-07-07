import { buildIdempotencyKey } from '../../utils/idempotency';

export interface CheckoutCreateInput {
  amount: number;
  currency: 'NGN' | 'CDF' | 'USD';
  customerEmail: string;
  callbackUrl: string;
  orderReference?: string;
  customerId?: string;
  tokenizeCard?: boolean;
  orderMetaData?: Record<string, string>;
}

export interface RefundCreateInput {
  transactionId: string;
  amount?: number;
  accountNumber?: string;
  bankCode?: string;
}

export interface TransferInitiateInput {
  amount: number;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  merchantTxRef: string;
  senderName?: string;
  narration?: string;
}

export interface VirtualAccountCreateInput {
  accountRef: string;
  accountName: string;
  expectedAmount?: number;
  bvn?: string;
  expiryDate?: string;
  subAccountId?: string;
}

const IDEMPOTENCY_HEADER = 'Idempotency-Key';

function ensurePositiveAmount(amount: number, fieldName: string): void {
  if (amount <= 0) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }
}

function optionalTrimmed(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function idempotencyHeaders(reference?: string): Record<string, string> {
  return {
    [IDEMPOTENCY_HEADER]: buildIdempotencyKey(reference),
  };
}

export function buildCreatePaymentLinkRequest(input: CheckoutCreateInput): {
  body: Record<string, unknown>;
  headers: Record<string, string>;
} {
  ensurePositiveAmount(input.amount, 'Amount');

  const customerEmail = optionalTrimmed(input.customerEmail);
  const callbackUrl = optionalTrimmed(input.callbackUrl);

  if (!customerEmail) {
    throw new Error('Customer Email is required.');
  }

  if (!callbackUrl) {
    throw new Error('Callback URL is required.');
  }

  const orderReference = optionalTrimmed(input.orderReference);

  const order: Record<string, unknown> = {
    amount: input.amount,
    currency: input.currency,
    customerEmail,
    callbackUrl,
  };

  const customerId = optionalTrimmed(input.customerId);
  if (customerId) {
    order.customerId = customerId;
  }

  if (orderReference) {
    order.orderReference = orderReference;
  }

  if (input.orderMetaData && Object.keys(input.orderMetaData).length > 0) {
    order.orderMetaData = input.orderMetaData;
  }

  const body: Record<string, unknown> = {
    order,
  };

  if (input.tokenizeCard !== undefined) {
    body.tokenizeCard = input.tokenizeCard;
  }

  return {
    body,
    headers: idempotencyHeaders(orderReference),
  };
}

export function buildCreateRefundRequest(input: RefundCreateInput): {
  body: Record<string, unknown>;
  headers: Record<string, string>;
} {
  const transactionId = optionalTrimmed(input.transactionId);
  if (!transactionId) {
    throw new Error('Transaction ID is required for refund requests.');
  }

  if (input.amount !== undefined) {
    ensurePositiveAmount(input.amount, 'Refund Amount');
  }

  const body: Record<string, unknown> = {
    transactionId,
  };

  if (input.amount !== undefined) {
    body.amount = input.amount;
  }

  const accountNumber = optionalTrimmed(input.accountNumber);
  if (accountNumber) {
    body.accountNumber = accountNumber;
  }

  const bankCode = optionalTrimmed(input.bankCode);
  if (bankCode) {
    body.bankCode = bankCode;
  }

  return {
    body,
    headers: idempotencyHeaders(transactionId),
  };
}

export function buildInitiateTransferRequest(input: TransferInitiateInput): {
  body: Record<string, unknown>;
  headers: Record<string, string>;
} {
  ensurePositiveAmount(input.amount, 'Transfer Amount');

  const accountNumber = optionalTrimmed(input.accountNumber);
  const accountName = optionalTrimmed(input.accountName);
  const bankCode = optionalTrimmed(input.bankCode);
  const merchantTxRef = optionalTrimmed(input.merchantTxRef);

  if (!accountNumber) {
    throw new Error('Recipient account number is required.');
  }
  if (!accountName) {
    throw new Error('Recipient account name is required.');
  }
  if (!bankCode) {
    throw new Error('Bank code is required.');
  }
  if (!merchantTxRef) {
    throw new Error('Merchant transaction reference is required.');
  }

  const body: Record<string, unknown> = {
    amount: input.amount,
    accountNumber,
    accountName,
    bankCode,
    merchantTxRef,
  };

  const narration = optionalTrimmed(input.narration);
  if (narration) {
    body.narration = narration;
  }

  const senderName = optionalTrimmed(input.senderName);
  if (senderName) {
    body.senderName = senderName;
  }

  return {
    body,
    headers: idempotencyHeaders(merchantTxRef),
  };
}

export function buildCreateVirtualAccountRequest(input: VirtualAccountCreateInput): {
  path: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
} {
  const accountRef = optionalTrimmed(input.accountRef);
  const accountName = optionalTrimmed(input.accountName);

  if (!accountRef) {
    throw new Error('Account reference is required.');
  }

  if (!accountName) {
    throw new Error('Account name is required.');
  }

  if (input.expectedAmount !== undefined) {
    ensurePositiveAmount(input.expectedAmount, 'Expected Amount');
  }

  const body: Record<string, unknown> = {
    accountRef,
    accountName,
  };

  const bvn = optionalTrimmed(input.bvn);
  if (bvn) {
    body.bvn = bvn;
  }

  const expiryDate = optionalTrimmed(input.expiryDate);
  if (expiryDate) {
    body.expiryDate = expiryDate;
  }

  if (input.expectedAmount !== undefined) {
    body.expectedAmount = input.expectedAmount;
  }

  const subAccountId = optionalTrimmed(input.subAccountId);
  const path = subAccountId
    ? `/v1/accounts/virtual/${encodeURIComponent(subAccountId)}`
    : '/v1/accounts/virtual';

  return {
    path,
    body,
    headers: idempotencyHeaders(accountRef),
  };
}
