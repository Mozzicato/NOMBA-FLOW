# Nomba Flow Test PRD and Runbook

## Goal

Prove Nomba Flow works from code-level safety to real n8n usage, then to a
production-style Nomba webhook setup.

## What Counts as Tested

Nomba Flow is test-ready when:

- Automated tests pass.
- The package builds into `dist/`.
- n8n starts locally.
- `Nomba` and `Nomba Trigger` appear in the n8n node picker.
- Templates import into n8n.
- A signed webhook is accepted.
- A tampered webhook is rejected.
- A public HTTPS webhook URL can be registered in Nomba sandbox/production.

## Test Layers

### Layer 1: Automated Code Tests

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected:

- All tests pass.
- TypeScript has no errors.
- ESLint has no errors.
- `dist/` is generated.

### Layer 2: Local Webhook Security Test Without n8n

This validates the same signature logic used by the n8n trigger.

Terminal 1:

```powershell
npm.cmd run build
$env:NOMBA_WEBHOOK_KEY="NombaHackathon2026"
node scripts/local-webhook-server.cjs
```

Terminal 2:

```powershell
$env:NOMBA_WEBHOOK_KEY="NombaHackathon2026"
node scripts/send-test-webhook.cjs
```

Expected:

- Valid webhook returns `HTTP 200`.
- Tampered webhook returns `HTTP 401`.

### Layer 3: Local n8n UI Test With Docker

Run:

```powershell
npm.cmd run build
docker compose up
```

Open:

```text
http://localhost:5678
```

Inside n8n:

1. Create an owner account if prompted.
2. Create a workflow.
3. Search for `Nomba`.
4. Confirm these nodes exist:
   - `Nomba`
   - `Nomba Trigger`
5. Create `Nomba API` credentials.
6. Import `examples/templates/template-5-virtual-account-funded.json`.
7. Select credentials on the trigger.
8. Activate the workflow.
9. Copy the Nomba Trigger Production URL.
10. Send a signed test webhook:

```powershell
$env:NOMBA_WEBHOOK_KEY="NombaHackathon2026"
node scripts/send-test-webhook.cjs <N8N_TRIGGER_PRODUCTION_URL>
```

Expected:

- Valid webhook returns `200`.
- Tampered webhook returns `401`.
- n8n records one successful execution.
- Trigger output includes `event`, `merchant`, `transaction`, and `raw`.

## Current Local Docker Blocker

On this machine, Docker Compose could not start because Docker Desktop’s Linux
engine is not running.

Observed command:

```powershell
docker-compose up -d
```

Observed error:

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
Docker Desktop is unable to start
```

Root cause found:

```powershell
wsl -l -v
```

Output:

```text
Windows Subsystem for Linux has no installed distributions.
```

Attempted fix:

```powershell
wsl --install -d Ubuntu
```

Observed error:

```text
Error Code: 0x80072ee7
```

That error usually means Windows could not download Ubuntu due to network/DNS or
Microsoft Store connectivity.

## Docker Fix Steps

Do this once:

1. Make sure the machine has stable internet.
2. Open Docker Desktop manually.
3. Install Ubuntu for WSL using one of:

```powershell
wsl --install -d Ubuntu
```

or install **Ubuntu** from the Microsoft Store.

4. Restart the machine if Windows asks.
5. Open Ubuntu once and finish username/password setup.
6. Open Docker Desktop again.
7. Confirm Docker works:

```powershell
docker info
```

8. Start n8n:

```powershell
docker compose up
```

## Production-Style Test

Localhost cannot receive Nomba webhooks directly. Use a public HTTPS tunnel.

Example:

```powershell
$env:WEBHOOK_URL="https://your-tunnel-url.trycloudflare.com"
docker compose up
```

Then:

1. Open n8n.
2. Activate the Nomba Trigger workflow.
3. Copy the Production URL.
4. Register it in Nomba dashboard.
5. Send sandbox events first.
6. Only test production after sandbox passes.

## Production Go / No-Go

Go only if:

- Local tests pass.
- Local n8n loads the nodes.
- Template import works.
- Signature verification is enabled.
- Replay protection is enabled.
- Sandbox webhook reaches n8n.
- Invalid signature is rejected.
- No secrets are committed.

Do not go live if:

- Docker/n8n was never tested.
- You cannot see workflow execution logs.
- Transfer/refund workflows were not tested in sandbox.
- You are unsure whether credentials are sandbox or production.
