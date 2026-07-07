# Local n8n Testing Guide

This project does not need a separate frontend. n8n is the user interface.

Use this guide to test Nomba Flow from zero n8n experience to a production-style
webhook test.

## What You Are Testing

- The **Nomba** node appears in n8n and can run payment operations.
- The **Nomba Trigger** node appears in n8n and can receive signed webhooks.
- Workflow templates import correctly.
- Webhook signature verification rejects bad requests.
- The same flow can be exposed with a public URL for Nomba sandbox/production.

## 1. Build the Node Package

```bash
npm run build
```

On Windows PowerShell, use:

```powershell
npm.cmd run build
```

## 2. Start n8n Locally

```bash
docker compose up
```

Shortcut:

```bash
npm run n8n:up
```

Open:

```text
http://localhost:5678
```

If n8n asks you to create an owner account, create one. This is only for your
local n8n instance.

## 3. Confirm the Nodes Loaded

Inside n8n:

1. Click **Create Workflow**.
2. Click the plus button to add a node.
3. Search for `Nomba`.
4. Confirm both nodes appear:
   - **Nomba**
   - **Nomba Trigger**

If they do not appear:

1. Stop Docker with `Ctrl+C`.
2. Run `npm run build`.
3. Start `docker compose up` again.
4. Refresh n8n.

## 4. Create Credentials

Inside n8n:

1. Go to **Credentials**.
2. Create **Nomba API** credentials.
3. Fill:
   - Client ID
   - Client Secret
   - Parent Account ID
   - Default Sub Account ID, if you have one
   - Webhook Signing Key
   - Environment: Sandbox first

For local mock webhook testing, you can use:

```text
Webhook Signing Key: NombaHackathon2026
```

Use real Nomba sandbox/production keys only when testing against real Nomba.

## 5. Test the Nomba Action Node

Create a workflow:

1. Add **Manual Trigger**.
2. Add **Nomba**.
3. Select your Nomba credentials.
4. Set:
   - Resource: `Checkout`
   - Operation: `Verify Payment`
5. Provide a test order reference or order ID.
6. Click **Execute Workflow**.

Expected result:

- The Nomba node runs.
- The output contains `statusCode`, `data`, and `_nomba`.

If you do not have real Nomba sandbox data yet, skip this and test webhooks
with the local mock sender below.

## 6. Test the Nomba Trigger in n8n

Create a workflow:

1. Add **Nomba Trigger**.
2. Select your Nomba credentials.
3. Keep **Verify Signature** enabled.
4. Keep **Enable Replay Protection** enabled.
5. Select event: `Virtual Account Funded`.
6. Add a **Set** node after it.
7. Save the workflow.
8. Activate the workflow.
9. Copy the trigger **Production URL**.

Send a signed test webhook:

```bash
NOMBA_WEBHOOK_KEY=NombaHackathon2026 node scripts/send-test-webhook.cjs <PASTE_N8N_PRODUCTION_URL>
```

Shortcut:

```bash
NOMBA_WEBHOOK_KEY=NombaHackathon2026 npm run webhook:send -- <PASTE_N8N_PRODUCTION_URL>
```

On Windows PowerShell:

```powershell
$env:NOMBA_WEBHOOK_KEY="NombaHackathon2026"
node scripts/send-test-webhook.cjs <PASTE_N8N_PRODUCTION_URL>
```

Expected result:

- The valid signature request returns `200`.
- The tampered signature request returns `401`.
- n8n shows one successful workflow execution.
- The output has:
  - `event.type`
  - `event.rawType`
  - `merchant`
  - `transaction`
  - `raw`

## 7. Import Templates

Inside n8n:

1. Open **Workflows**.
2. Import from file.
3. Pick a file from `examples/templates`.
4. Select credentials on the Nomba Trigger node.
5. Save and activate the workflow.

Start with:

```text
examples/templates/template-5-virtual-account-funded.json
```

That template matches the default mock webhook payload.

## 8. Production-Style Webhook Test

Localhost cannot receive webhooks from Nomba directly. You need a public HTTPS
URL that forwards to your local machine.

Use one of:

- Cloudflare Tunnel
- ngrok
- a deployed n8n instance

Example with Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:5678
```

Then restart n8n with `WEBHOOK_URL` set to the tunnel URL:

```bash
WEBHOOK_URL=https://your-tunnel-url.trycloudflare.com docker compose up
```

On Windows PowerShell:

```powershell
$env:WEBHOOK_URL="https://your-tunnel-url.trycloudflare.com"
docker compose up
```

Now the Nomba Trigger Production URL should use the tunnel domain. Register that
URL in the Nomba dashboard.

## 9. Real Production Test Plan

Do not start with live money movement. Use this order:

1. Local unit tests: `npm test`
2. Local n8n node loading test
3. Local signed mock webhook test
4. Nomba sandbox read operation
5. Nomba sandbox payment link creation
6. Nomba sandbox webhook delivery through tunnel
7. One tiny live production read operation
8. One tiny live production payment link
9. Production webhook confirmation
10. Only then enable transfer/refund workflows

## 10. Go / No-Go Checklist

Go only if:

- `npm test` passes.
- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Nomba and Nomba Trigger appear in n8n.
- Templates import successfully.
- Valid signed webhook returns `200`.
- Invalid signed webhook returns `401`.
- Replay protection rejects repeated event IDs.
- No real credentials are committed to git.

Stop if:

- Signature verification is disabled in production.
- Webhook signing key is missing.
- Transfer/refund workflows are untested.
- You cannot see failed executions in n8n.
- You are not sure whether the environment is sandbox or production.
