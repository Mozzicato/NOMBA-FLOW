# Testing Checklist

## Stage 0 Checklist
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] CI workflow passes on push/PR

## Stage 1 Checklist
- [ ] Credential validation tests (missing/invalid/expired)
- [ ] Header auth behavior tests
- [ ] Secret redaction tests
- [ ] Retry policy tests

## Stage 2+ Checklist
- [ ] Operation contract tests
- [ ] Error mapping tests
- [x] Webhook security tests (signature verification: `tests/signature.test.ts`)
- [ ] Idempotency safety tests
- [ ] Template import tests
- [ ] End-to-end smoke tests
