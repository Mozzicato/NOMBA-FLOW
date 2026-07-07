# Architecture

## Components

### Credentials (NombaApi)
- Client ID, Client Secret, Account IDs, Webhook Keys
- Supports key rotation via secondary fields

### HTTP Client (NombaHttpClient)
- OAuth client-credentials flow
- Token caching until near expiry
- Retry with exponential backoff + jitter
- Timeout enforcement
- Header redaction on log output

### Nodes

#### Nomba (Action Node)
- Checkout (Create Payment Link, Verify Payment)
- Transactions (Get, List, Search)
- Transfers (Initiate, Verify)
- Refunds (Create)
- Virtual Accounts (Create, Get)

#### NombaTrigger (Trigger Node)
- Receives signed webhooks from Nomba
- Verifies HMAC-SHA256 signatures
- Validates timestamp freshness
- Detects and rejects replayed events
- Emits payload to n8n workflow

### Utilities
- Signature verification + rotation support
- Webhook replay protection store
- Idempotency key generation
- Secret redaction for logs
- Retry strategy management

## Security Properties
- All secrets transmitted via HTTPS
- Webhook signature verification mandatory in production
- Replay window prevents duplicate processing
- Timestamp validation prevents stale attacks
- Secrets never logged

## Reliability Properties
- Automatic retries for 5xx and 429
- Token caching reduces auth latency
- Idempotency headers on write operations
- Timeout protection on all requests
- Graceful degradation when Nomba is down
