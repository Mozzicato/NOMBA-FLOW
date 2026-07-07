# Quick Start

New to n8n? Start with `docs/local-n8n-testing.md`. That guide explains how to
open n8n, load this package, create credentials, import templates, and send a
signed test webhook.

## 1. Configure Credentials
Create Nomba API credentials in n8n and fill:
- Client ID
- Client Secret
- Parent Account ID
- Optional Default Sub Account ID
- Environment

## 2. First Read Workflow (5 minutes)
1. Add Manual Trigger.
2. Add Nomba node.
3. Set Resource = Checkout.
4. Set Operation = Verify Payment.
5. Provide Identifier Type and Identifier.
6. Execute workflow.

## 3. First Write Workflow (5 minutes)
1. Add Manual Trigger.
2. Add Nomba node.
3. Set Resource = Checkout.
4. Set Operation = Create Payment Link.
5. Provide amount, currency, email, callback URL.
6. Execute and open returned checkout link.

## 4. Trigger Workflow
1. Add Nomba Trigger node.
2. Copy Production URL.
3. Register URL with Nomba.
4. Set signing key in credentials.
5. Trigger a sandbox event and confirm workflow execution.
