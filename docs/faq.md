# FAQ

## Do I need both parent and sub account IDs?
Parent account ID is required for authentication headers. Sub account ID is required for sub-account scoped operations.

## Does the node handle retries?
Yes. Network failures, 429, and 5xx are retried with exponential backoff and jitter.

## Are write operations idempotent?
Yes. Stage 3 write operations generate and send Idempotency-Key headers using business references where possible.

## Can I rotate webhook signing keys safely?
Yes. You can set a secondary key to accept signatures from both keys during rotation.

## Is replay protection persistent across restarts?
Current implementation is in-memory. For distributed persistence, add an external shared store.
