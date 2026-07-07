# Contribution Guide

## Workflow
1. Create a feature branch.
2. Implement small, testable changes.
3. Run quality gates locally.
4. Open pull request with test evidence.

## Local Quality Gates
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Coding Standards
- TypeScript strict mode.
- No secret logging.
- Add tests for every behavior change.
- Keep operation payload mapping explicit and documented.

## Pull Request Checklist
- [ ] Tests added/updated
- [ ] Docs updated
- [ ] No sensitive files committed
- [ ] CI green
