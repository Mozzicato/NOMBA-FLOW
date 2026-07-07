import type { ReactElement } from 'react';
import type { NodeDef, NodeKind } from './types';

export const NODE_DEFS: Record<NodeKind, NodeDef> = {
  payment: {
    kind: 'payment',
    label: 'Payment Received',
    subtitle: 'Trigger',
    color: '#2dd4a0',
    colorSoft: 'rgba(45, 212, 160, 0.14)',
    description: 'Starts the workflow whenever a payment lands in your Nomba account.',
    fields: [
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'currency', label: 'Currency', type: 'select', options: ['NGN', 'USD', 'GHS'] },
      {
        key: 'trigger',
        label: 'Trigger',
        type: 'select',
        options: ['Payment Completed', 'Payment Pending', 'Any Payment Event'],
      },
    ],
    defaults: { amount: '2500', currency: 'NGN', trigger: 'Payment Completed' },
  },
  verify: {
    kind: 'verify',
    label: 'Verify Payment',
    subtitle: 'Action',
    color: '#4d9fff',
    colorSoft: 'rgba(77, 159, 255, 0.14)',
    description: 'Confirms the transaction against the Nomba API before anything else runs.',
    fields: [
      { key: 'apiStatus', label: 'API Status', type: 'readonly' },
      { key: 'connection', label: 'Connection', type: 'readonly' },
      { key: 'retries', label: 'Max Retries', type: 'select', options: ['1', '2', '3'] },
    ],
    defaults: { apiStatus: 'Connected', connection: 'Healthy', retries: '2' },
  },
  receipt: {
    kind: 'receipt',
    label: 'AI Receipt',
    subtitle: 'AI',
    color: '#a78bfa',
    colorSoft: 'rgba(167, 139, 250, 0.14)',
    description: 'Generates a personalized thank-you message for the customer using AI.',
    fields: [
      { key: 'prompt', label: 'Prompt', type: 'textarea' },
      { key: 'temperature', label: 'Temperature', type: 'select', options: ['0.2', '0.5', '0.7', '1.0'] },
    ],
    defaults: {
      prompt: 'Generate a warm thank-you receipt for the customer.',
      temperature: '0.7',
    },
  },
  notify: {
    kind: 'notify',
    label: 'Notify Merchant',
    subtitle: 'Action',
    color: '#ff9f43',
    colorSoft: 'rgba(255, 159, 67, 0.14)',
    description: 'Sends an in-app notification to the merchant dashboard.',
    fields: [
      {
        key: 'channel',
        label: 'Channel',
        type: 'select',
        options: ['Dashboard Notification', 'Email', 'SMS'],
      },
    ],
    defaults: { channel: 'Dashboard Notification' },
  },
  success: {
    kind: 'success',
    label: 'Success',
    subtitle: 'End',
    color: '#34d399',
    colorSoft: 'rgba(52, 211, 153, 0.14)',
    description: 'Marks the workflow as completed.',
    fields: [],
    defaults: {},
  },
};

export const LIBRARY_ORDER: NodeKind[] = ['payment', 'verify', 'receipt', 'notify', 'success'];

export function NodeIcon({ kind, size = 18 }: { kind: NodeKind; size?: number }): ReactElement {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (kind) {
    case 'payment':
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="19" height="14" rx="3" />
          <path d="M2.5 10h19" />
          <path d="M6.5 15h4" />
        </svg>
      );
    case 'verify':
      return (
        <svg {...common}>
          <path d="M12 2.8 4.5 6v5.2c0 4.6 3.2 8.4 7.5 9.9 4.3-1.5 7.5-5.3 7.5-9.9V6L12 2.8Z" />
          <path d="m8.8 11.8 2.3 2.3 4.1-4.4" />
        </svg>
      );
    case 'receipt':
      return (
        <svg {...common}>
          <path d="M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7L12 3.5Z" />
          <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
          <path d="M5 16.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6.6-1.5Z" />
        </svg>
      );
    case 'notify':
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
          <path d="M10 19a2.2 2.2 0 0 0 4 0" />
        </svg>
      );
    case 'success':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12.3 2.8 2.7L16 9.5" />
        </svg>
      );
  }
}
