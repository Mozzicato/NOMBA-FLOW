# Troubleshooting

## Auth Fails
- Check client ID/secret values.
- Check accountId header value (parent account).
- Confirm environment selection matches credentials.

## Missing Sub Account Errors
- Add Default Sub Account ID in credentials.
- Or provide operation-level subAccountId in node fields.

## Signature Verification Failures
- Ensure webhook signing key is correct.
- Ensure n8n server clock is synchronized.
- Check if event is a replay within active window.

## Rate Limit Responses (429)
- Retries are automatic with backoff.
- Reduce parallelism in high-throughput workflows.

## Build/Test Failures
Run:
```bash
npm run lint
npm run typecheck
npm test
npm run build
```
