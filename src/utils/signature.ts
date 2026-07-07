import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Fields Nomba concatenates (colon-separated) to build the string that is signed.
 * See https://developer.nomba.com/docs/api-basics/webhook
 *
 * Order matters:
 *   eventType:requestId:userId:walletId:transactionId:transactionType:transactionTime:responseCode:timestamp
 */
export interface WebhookSignatureFields {
  eventType: string;
  requestId: string;
  userId: string;
  walletId: string;
  transactionId: string;
  transactionType: string;
  transactionTime: string;
  responseCode: string;
  /** Value of the `nomba-timestamp` header (RFC-3339). */
  timestamp: string;
}

function asString(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

/**
 * Extracts the signature fields from a parsed Nomba webhook body plus the
 * `nomba-timestamp` header. Missing fields become empty strings, mirroring how
 * Nomba builds the payload (e.g. `responseCode` is often blank).
 */
export function extractSignatureFields(body: unknown, timestamp: string): WebhookSignatureFields {
  const root = (body ?? {}) as Record<string, unknown>;
  const data = (root.data ?? {}) as Record<string, unknown>;
  const merchant = (data.merchant ?? {}) as Record<string, unknown>;
  const transaction = (data.transaction ?? {}) as Record<string, unknown>;

  return {
    eventType: asString(root.event_type),
    requestId: asString(root.requestId),
    userId: asString(merchant.userId),
    walletId: asString(merchant.walletId),
    transactionId: asString(transaction.transactionId),
    transactionType: asString(transaction.type),
    transactionTime: asString(transaction.time),
    responseCode: asString(transaction.responseCode),
    timestamp: asString(timestamp),
  };
}

/** Builds the exact colon-separated string Nomba signs. */
export function buildSigningPayload(fields: WebhookSignatureFields): string {
  return [
    fields.eventType,
    fields.requestId,
    fields.userId,
    fields.walletId,
    fields.transactionId,
    fields.transactionType,
    fields.transactionTime,
    fields.responseCode,
    fields.timestamp,
  ].join(':');
}

/** Computes the base64 HMAC-SHA256 signature for a signing payload. */
export function computeSignature(signingKey: string, signingPayload: string): string {
  return createHmac('sha256', signingKey).update(signingPayload, 'utf8').digest('base64');
}

/** Constant-time comparison of two signatures, safe against length mismatches. */
export function signaturesMatch(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Verifies a Nomba webhook signature.
 *
 * @param body       Parsed JSON webhook body.
 * @param signingKey Webhook signing key from the Nomba dashboard.
 * @param signature  Value of the `nomba-signature` header.
 * @param timestamp  Value of the `nomba-timestamp` header.
 */
export function verifyWebhookSignature(
  body: unknown,
  signingKey: string,
  signature: string | undefined,
  timestamp: string | undefined,
): boolean {
  if (!signingKey || !signature) {
    return false;
  }

  const fields = extractSignatureFields(body, timestamp ?? '');
  const expected = computeSignature(signingKey, buildSigningPayload(fields));

  return signaturesMatch(expected, signature);
}

export function verifyWebhookSignatureWithAnyKey(
  body: unknown,
  signingKeys: string[],
  signature: string | undefined,
  timestamp: string | undefined,
): boolean {
  if (!signature) {
    return false;
  }

  for (const signingKey of signingKeys) {
    if (!signingKey) {
      continue;
    }

    if (verifyWebhookSignature(body, signingKey, signature, timestamp)) {
      return true;
    }
  }

  return false;
}
