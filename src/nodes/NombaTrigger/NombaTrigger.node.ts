import type {
  IDataObject,
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  IWebhookResponseData,
} from 'n8n-workflow';

import { verifyWebhookSignatureWithAnyKey } from '../../utils/signature';
import {
  extractReplayId,
  globalReplayWindowStore,
  isTimestampWithinTolerance,
} from '../../utils/webhookSecurity';

interface TriggerCredentials {
  webhookSigningKey?: string;
  webhookSigningKeySecondary?: string;
}

const SIGNATURE_HEADER = 'nomba-signature';
const TIMESTAMP_HEADER = 'nomba-timestamp';
const DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 300;

export const NOMBA_TRIGGER_EVENTS = [
  { name: 'Payment Successful', value: 'payment_successful' },
  { name: 'Payment Failed', value: 'payment_failed' },
  { name: 'Refund Created', value: 'refund_created' },
  { name: 'Refund Completed', value: 'refund_completed' },
  { name: 'Transfer Completed', value: 'transfer_completed' },
  { name: 'Transfer Failed', value: 'transfer_failed' },
  { name: 'Virtual Account Funded', value: 'virtual_account_funded' },
] as const;

type NombaTriggerEventValue = (typeof NOMBA_TRIGGER_EVENTS)[number]['value'];

function headerValue(headers: Record<string, unknown>, name: string): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) {
    return raw[0];
  }
  return typeof raw === 'string' ? raw : undefined;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function eventMatches(selectedEvents: string[], normalizedEventType: string, rawEventType: string): boolean {
  if (selectedEvents.length === 0) {
    return true;
  }

  return selectedEvents.includes(normalizedEventType) || selectedEvents.includes(rawEventType);
}

export function normalizeNombaWebhookEvent(body: IDataObject): IDataObject {
  const rawEventType = stringValue(body.event_type);
  const data = objectValue(body.data);
  const transaction = objectValue(data.transaction);
  const transactionType = stringValue(transaction.type).toLowerCase();
  const transactionStatus = stringValue(transaction.status).toLowerCase();
  const responseCode = stringValue(transaction.responseCode);

  let eventType: NombaTriggerEventValue | string = rawEventType;

  if (rawEventType === 'payment_success') {
    eventType = transactionType.includes('vact') ? 'virtual_account_funded' : 'payment_successful';
  } else if (rawEventType === 'payment_failed') {
    eventType = 'payment_failed';
  } else if (rawEventType === 'payout_success') {
    eventType = 'transfer_completed';
  } else if (rawEventType === 'payout_failed') {
    eventType = 'transfer_failed';
  } else if (rawEventType === 'refund') {
    eventType = transactionStatus.includes('created') || responseCode === '09' ? 'refund_created' : 'refund_completed';
  }

  return {
    event: {
      type: eventType,
      rawType: rawEventType,
    },
    merchant: objectValue(data.merchant),
    transaction,
    raw: body,
  };
}

export class NombaTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Nomba Trigger',
    name: 'nombaTrigger',
    icon: 'file:nomba.svg',
    group: ['trigger'],
    version: 1,
    subtitle: '={{$parameter["events"]}}',
    description: 'Starts a workflow when Nomba forwards a signed webhook event.',
    defaults: {
      name: 'Nomba Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'nombaApi',
        required: true,
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'nomba',
      },
    ],
    properties: [
      {
        displayName:
          'Register this node\'s Production URL as your Webhook URL in the Nomba dashboard. Nomba signs every event; the signature is verified with the webhook signing key stored in your Nomba API credentials.',
        name: 'notice',
        type: 'notice',
        default: '',
      },
      {
        displayName: 'Events',
        name: 'events',
        type: 'multiOptions',
        default: [],
        description: 'Only emit for these business events. Leave empty to receive all supported events.',
        options: [...NOMBA_TRIGGER_EVENTS],
      },
      {
        displayName: 'Verify Signature',
        name: 'verifySignature',
        type: 'boolean',
        default: true,
        description:
          'Whether to reject events whose nomba-signature header fails HMAC verification. Keep enabled in production.',
      },
      {
        displayName: 'Timestamp Tolerance (Seconds)',
        name: 'timestampToleranceSeconds',
        type: 'number',
        default: DEFAULT_TIMESTAMP_TOLERANCE_SECONDS,
        typeOptions: {
          minValue: 10,
          maxValue: 3600,
        },
        description:
          'Maximum allowed clock skew for nomba-timestamp. Requests outside this window are rejected as possible replay attacks.',
        displayOptions: {
          show: {
            verifySignature: [true],
          },
        },
      },
      {
        displayName: 'Enable Replay Protection',
        name: 'enableReplayProtection',
        type: 'boolean',
        default: true,
        description:
          'Whether to reject duplicate requestId/transactionId values within the timestamp tolerance window.',
        displayOptions: {
          show: {
            verifySignature: [true],
          },
        },
      },
    ],
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    const body = this.getBodyData() as IDataObject;
    const headers = this.getHeaderData() as Record<string, unknown>;

    const verifySignature = this.getNodeParameter('verifySignature', true) as boolean;
    const eventFilter = this.getNodeParameter('events', []) as string[];

    if (verifySignature) {
      const credentials = (await this.getCredentials('nombaApi')) as unknown as TriggerCredentials;
      const signingKeys = [
        (credentials.webhookSigningKey ?? '').trim(),
        (credentials.webhookSigningKeySecondary ?? '').trim(),
      ].filter((key) => key.length > 0);

      if (signingKeys.length === 0) {
        throw new Error(
          'Webhook signing key is not set. Add it to your Nomba API credentials or disable "Verify Signature".',
        );
      }

      const signature = headerValue(headers, SIGNATURE_HEADER);
      const timestamp = headerValue(headers, TIMESTAMP_HEADER);
      const rawBody = (req as { rawBody?: Buffer | string }).rawBody;
      const bodyForSignature = rawBody ? safeParse(rawBody) : body;

      const toleranceSeconds = this.getNodeParameter(
        'timestampToleranceSeconds',
        DEFAULT_TIMESTAMP_TOLERANCE_SECONDS,
      ) as number;
      const enableReplayProtection = this.getNodeParameter('enableReplayProtection', true) as boolean;

      if (!timestamp || !isTimestampWithinTolerance(timestamp, toleranceSeconds)) {
        const res = this.getResponseObject();
        res.status(401).json({ message: 'Invalid or stale nomba-timestamp header' });
        return { noWebhookResponse: true };
      }

      const isValid = verifyWebhookSignatureWithAnyKey(bodyForSignature, signingKeys, signature, timestamp);

      if (!isValid) {
        // 401 without emitting an item, so spoofed calls never enter the workflow.
        const res = this.getResponseObject();
        res.status(401).json({ message: 'Invalid Nomba webhook signature' });
        return { noWebhookResponse: true };
      }

      if (enableReplayProtection) {
        const replayId = extractReplayId(bodyForSignature);
        if (!replayId) {
          const res = this.getResponseObject();
          res.status(401).json({ message: 'Missing replay identifier in webhook payload' });
          return { noWebhookResponse: true };
        }

        const accepted = globalReplayWindowStore.registerOrReject(replayId, toleranceSeconds);
        if (!accepted) {
          const res = this.getResponseObject();
          res.status(401).json({ message: 'Duplicate webhook event rejected' });
          return { noWebhookResponse: true };
        }
      }
    }

    const normalized = normalizeNombaWebhookEvent(body);
    const event = normalized.event as IDataObject;
    const normalizedEventType = stringValue(event.type);
    const rawEventType = stringValue(event.rawType);

    if (!eventMatches(eventFilter, normalizedEventType, rawEventType)) {
      // Acknowledged but not forwarded into the workflow.
      return { webhookResponse: { message: 'ignored' } };
    }

    return {
      workflowData: [this.helpers.returnJsonArray([normalized])],
    };
  }
}

function safeParse(raw: Buffer | string): unknown {
  try {
    return JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8'));
  } catch {
    return undefined;
  }
}
