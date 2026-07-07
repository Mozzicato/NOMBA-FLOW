import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class NombaApi implements ICredentialType {
  name = 'nombaApi';

  displayName = 'Nomba API';

  documentationUrl = 'https://github.com/Mozzicato/NOMBA-FLOW';

  properties: INodeProperties[] = [
    {
      displayName: 'Client ID',
      name: 'clientId',
      type: 'string',
      default: '',
      required: true,
      placeholder: '706df6c4-b8bb-4130-88c4-d21b052f8631',
      description: 'Client ID from your Nomba dashboard.',
    },
    {
      displayName: 'Client Secret',
      name: 'clientSecret',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      description:
        'Client secret from your Nomba dashboard. This may be called private key in onboarding docs.',
    },
    {
      displayName: 'Parent Account ID',
      name: 'accountId',
      type: 'string',
      default: '',
      required: true,
      placeholder: 'f666ef9b-888e-4799-85ce-acb505b28023',
      description: 'Parent account identifier sent in the accountId header for authenticated requests.',
    },
    {
      displayName: 'Default Sub Account ID',
      name: 'subAccountId',
      type: 'string',
      default: '',
      required: false,
      placeholder: 'c3e673d2-8855-494a-9c48-f4d2b92f8db2',
      description:
        'Optional default sub account used by transaction and transfer operations when not overridden in node parameters.',
    },
    {
      displayName: 'Webhook Signing Key',
      name: 'webhookSigningKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: false,
      description:
        'Signing key used to verify the nomba-signature header on incoming webhooks. Required by the Nomba Trigger node when signature verification is enabled.',
    },
    {
      displayName: 'Webhook Signing Key (Secondary)',
      name: 'webhookSigningKeySecondary',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: false,
      description:
        'Optional secondary signing key used during key rotation. Trigger accepts signatures from either key while this field is populated.',
    },
    {
      displayName: 'Environment',
      name: 'environment',
      type: 'options',
      options: [
        {
          name: 'Production',
          value: 'production',
        },
        {
          name: 'Sandbox',
          value: 'sandbox',
        },
      ],
      default: 'production',
      description: 'Select the Nomba environment your account is configured for.',
    },
  ];
}
