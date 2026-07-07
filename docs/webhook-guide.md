# Webhook Guide

## Nomba Trigger Setup
1. Add Nomba Trigger node.
2. Enable signature verification.
3. Set webhook signing key in credentials.
4. Copy Production URL and submit to Nomba.

## Security Controls
- HMAC-SHA256 signature verification
- Constant-time signature comparison
- Timestamp tolerance validation
- Replay protection (requestId/transactionId window)
- Secondary signing key support for rotation overlap

## Event Filtering
You can subscribe to all events or selected events.
Filterable business event values include:
- payment_successful
- payment_failed
- refund_created
- refund_completed
- transfer_completed
- transfer_failed
- virtual_account_funded

Incoming raw Nomba event names are normalized into these business events before
they enter the workflow. The trigger output includes:
- event.type: normalized business event
- event.rawType: original Nomba event type
- merchant: merchant payload
- transaction: transaction payload
- raw: full original webhook payload

## Troubleshooting
If events are rejected with 401:
- confirm signing key
- confirm timestamp freshness
- confirm payload is not replayed
