# Authentication Guide

Nomba Flow uses client credentials authentication.

## Required Credential Fields
- Client ID
- Client Secret
- Parent Account ID
- Environment (production/sandbox)

Optional:
- Default Sub Account ID
- Webhook Signing Key
- Secondary Webhook Signing Key (rotation overlap)

## Runtime Auth Flow
1. Node requests access token from /v1/auth/token/issue.
2. Access token is cached until near expiry.
3. API requests include:
   - Authorization: Bearer <access_token>
   - accountId: <parent-account-id>

## Security Practices
- Rotate client secrets periodically.
- Use sandbox credentials during development.
- Keep token and key values out of logs.
