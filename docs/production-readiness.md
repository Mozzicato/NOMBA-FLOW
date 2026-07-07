# Production Readiness Checklist

## Pre-Release Validation
- [ ] All tests passing (npm test)
- [ ] Type checking passes (npm run typecheck)
- [ ] Linting passes (npm run lint)
- [ ] Build completes (npm run build)
- [ ] Local n8n smoke test completed (`docs/local-n8n-testing.md`)
- [ ] Valid signed webhook returns 200 in n8n
- [ ] Invalid signed webhook returns 401 in n8n
- [ ] Replay webhook is rejected
- [ ] No secrets in git history
- [ ] docs/technical_keys.md in .gitignore

## Deployment Checklist
- [ ] Credentials configured in n8n
- [ ] Webhook URL registered with Nomba
- [ ] Webhook signing key stored in credentials
- [ ] Sandbox environment validation complete
- [ ] Production environment URL confirmed

## Production Safety
- [ ] Retries enabled for retriable conditions
- [ ] Timeouts configured (default 20s)
- [ ] Signature verification enabled on triggers
- [ ] Replay protection enabled
- [ ] Rate limiting behavior tested
- [ ] Error logging configured (no secrets in logs)

## Monitoring Setup
- [ ] Workflow execution logs enabled
- [ ] Failed webhook handling implemented
- [ ] Webhook replay/duplicate visibility configured
- [ ] Auth token expiry alerts configured

## Documentation
- [ ] Runbooks for common issues written
- [ ] Team trained on node parameters
- [ ] Template imports tested
- [ ] Troubleshooting guide reviewed
