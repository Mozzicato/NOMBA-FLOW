# Node Reference

## Nomba Node Resources and Operations

### Checkout
- Create Payment Link
- Verify Payment

### Transactions
- Get Transaction
- List Transactions
- Search Transactions

### Transfers
- Initiate Transfer
- Verify Transfer

### Refunds
- Create Refund

### Virtual Accounts
- Create Virtual Account
- Get Virtual Account

## Behavior Guarantees
- Write operations include idempotency header generation.
- Retries use exponential backoff with jitter for retriable conditions.
- 4xx (except 429) are not retried.

## Response Shape
Each operation emits:
- statusCode
- data
- _nomba.resource
- _nomba.operation
