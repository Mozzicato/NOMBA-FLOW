# Testing Nomba Flow Without Docker or WSL

Docker in this project does exactly one thing: run n8n. **Everything that matters
— the code, the tests, the build, and the webhook security logic — runs on plain
Node.js.** If Docker/WSL is unavailable (locked-down Windows, blocked `wsl --update`,
no admin rights), use this guide. It reproduces every Go/No-Go check except the
purely cosmetic "click around the n8n UI" step.

## Prerequisites

- Node.js installed (`node --version`).
- Dependencies installed (`npm install`) and a fresh build (`npm run build`).

## 1. Quality gates (no Docker)

```powershell
npm.cmd test          # 75 unit tests + coverage
npm.cmd run typecheck # tsc --noEmit
npm.cmd run lint      # eslint
npm.cmd run build     # compile to dist/
```

## 2. Prove webhook signature verification (no n8n)

`scripts/local-webhook-server.cjs` reuses the **exact same** `verifyWebhookSignature`
the n8n Nomba Trigger node uses, so behaviour is identical.

Pick a free port (n8n's usual 3000 may be taken by another dev server):

```powershell
$env:NOMBA_WEBHOOK_KEY = "NombaHackathon2026"
$env:PORT = "3105"
node scripts/local-webhook-server.cjs
```

In a second terminal, send one correctly signed and one tampered request:

```powershell
$env:NOMBA_WEBHOOK_KEY = "NombaHackathon2026"
node scripts/send-test-webhook.cjs http://localhost:3105/webhook/nomba
```

Expected:

```text
valid signature   : HTTP 200 {"received":true}
tampered signature: HTTP 401 {"message":"Invalid Nomba webhook signature"}
```

## 3. Prove the nodes would load in n8n's palette (no n8n server)

`scripts/inspect-nodes.cjs` loads the compiled node and credential classes the same
way n8n's loader does and prints the `description` metadata n8n uses to render them.

```powershell
node scripts/inspect-nodes.cjs
```

Expected: clean descriptions for **Nomba** (5 resources, 10 operations), **Nomba
Trigger** (`POST /nomba` webhook), and the **Nomba API** credential. If these
instantiate without error, the nodes are valid and will appear in the n8n palette.

## 4. Optional: the real n8n UI

The only thing this misses is visually clicking the nodes inside n8n. n8n **does not
need Docker** — it runs natively:

```powershell
$env:N8N_CUSTOM_EXTENSIONS = "<absolute path to this project folder>"
$env:N8N_SECURE_COOKIE = "false"
$env:N8N_RUNNERS_ENABLED = "true"
$env:WEBHOOK_URL = "http://localhost:5678/"
n8n start   # then open http://localhost:5678
```

> **Node version note.** n8n supports Node 20/22. On Node 24, n8n 2.x fails at
> startup with `Package subpath './utils/uuid' is not defined by "exports"` in its
> bundled `@langchain/core` — this is an n8n/Node incompatibility, **not** a problem
> with the Nomba nodes. If you need the UI, install Node 22 (e.g. via nvm-windows)
> and re-run the launch above.
