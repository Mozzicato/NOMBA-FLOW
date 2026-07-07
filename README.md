# Nomba Flow

n8n community node for automating Nomba payment workflows.

## Current Status
Stage 0, Stage 1, Stage 2 read operations, Stage 3 write operations, and core Stage 4/5 trigger/template work are implemented:
- TypeScript build pipeline
- ESLint + Prettier formatting
- Vitest unit test setup with coverage
- GitHub Actions CI for lint, type-check, test, and build
- Nomba client-credentials authentication flow with token caching
- Core utility modules for retry, idempotency, and secret redaction
- Node operations:
   - Create Payment Link
   - Verify Payment
   - Create Refund
   - Initiate Transfer
   - Verify Transfer
   - Create Virtual Account
   - Get Transaction
   - List Transactions
   - Search Transactions
   - Get Virtual Account
- Nomba Trigger node (receives signed webhooks, verifies the `nomba-signature` header, normalizes business events)

## Webhooks
The **Nomba Trigger** node exposes an n8n webhook that Nomba calls on payment events.

1. Add the **Webhook Signing Key** (from the Nomba dashboard) to your Nomba API credentials.
2. Drop a **Nomba Trigger** node into a workflow and copy its **Production URL**.
3. Submit that URL as your Webhook URL to Nomba, together with your sub-account ID.

Every event is verified with HMAC-SHA256 over the Nomba-defined field payload
(`event_type:requestId:userId:walletId:transactionId:type:time:responseCode:timestamp`,
base64) using your signing key. Requests that fail verification are rejected with `401`
and never enter the workflow. See `src/utils/signature.ts`.

Additional security controls in the Trigger node:
- Timestamp tolerance check (`nomba-timestamp`) to reject stale requests.
- Replay protection using requestId/transactionId deduplication in a moving window.
- Signing key rotation via optional secondary signing key credential.

Trigger output is normalized for downstream workflow steps:
- `event.type` - one of `payment_successful`, `payment_failed`, `refund_created`, `refund_completed`, `transfer_completed`, `transfer_failed`, or `virtual_account_funded`
- `event.rawType` - original Nomba webhook event type
- `merchant` - merchant payload
- `transaction` - transaction payload
- `raw` - full original webhook payload

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run quality checks:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

## Local n8n Testing
If you have never used n8n before, follow `docs/local-n8n-testing.md`.
For the full test PRD, production-style test order, and Docker/WSL setup
troubleshooting, follow `docs/test-prd-and-runbook.md`.

Short path:
```bash
npm run build
docker compose up
```

Then open `http://localhost:5678`, confirm the Nomba nodes appear, and send a
signed mock webhook with:
```bash
NOMBA_WEBHOOK_KEY=NombaHackathon2026 node scripts/send-test-webhook.cjs <N8N_NOMBA_TRIGGER_PRODUCTION_URL>
```

## Scripts
- `npm run lint` - Run ESLint.
- `npm run typecheck` - Validate TypeScript types.
- `npm test` - Run Vitest with coverage.
- `npm run build` - Compile TypeScript to `dist/`.

## Security Notes
- Do not commit `.env` files.
- Keep Nomba API keys in secure secret stores.
- Utility helpers in `src/utils/redaction.ts` are available for safe logging.
- Client credentials are exchanged for access tokens via `/v1/auth/token/issue`.
- Parent account ID is sent in the `accountId` header for authenticated requests.
