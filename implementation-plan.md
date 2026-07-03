# Nomba Flow Implementation Plan

## Goal
Ship a hackathon-ready release that is also production-safe for high-scale adoption.

## Delivery Principles
- Security and money-safety over feature speed.
- Every stage has entry criteria, test coverage, and exit criteria.
- No stage is complete unless tests pass and evidence is captured.
- Build small, verify early, integrate continuously.

## Definition of Stage Done
A stage is only done when all conditions are met:
- Code implemented and reviewed.
- Required tests pass locally.
- CI pipeline checks pass for affected areas.
- Documentation for that stage is updated.
- Risks and follow-up tasks are tracked.

## Stage 0: Project Setup and Quality Baseline
### Objectives
- Initialize repository structure and coding standards.
- Set up CI and testing harness.
- Create environment and secrets strategy.

### Implementation Tasks
- Initialize node package, TypeScript config, linting, formatting.
- Add base folders: nodes, credentials, triggers, utils, tests, docs, examples.
- Configure CI workflow: lint, type-check, unit test, build.
- Define branch strategy and PR template.
- Add .env.example and secret handling rules.

### Tests to Run
- Lint runs with zero errors.
- Type-check runs with zero errors.
- Build compiles successfully.
- Test runner executes a placeholder sanity test.
- CI runs successfully on a sample pull request.

### Exit Criteria
- All baseline checks are green in CI.
- Team can clone, install, build, and test in under 10 minutes.

---

## Stage 1: API Client and Credential Layer
### Objectives
- Build a reusable Nomba API client.
- Implement secure credential storage and connection testing.

### Implementation Tasks
- Implement Nomba credential type for n8n.
- Build shared HTTP client wrapper with:
  - request signing/auth headers
  - timeout handling
  - retry strategy for retriable failures
  - error normalization
- Add Test Connection action for credentials.
- Add masking/redaction helpers for logs.

### Tests to Run
- Unit tests:
  - credential validation (missing, invalid, expired)
  - auth headers are correctly set
  - secrets are never logged
- Unit tests for HTTP client:
  - retries for network errors and HTTP 429
  - no retries for non-retriable 4xx
  - exponential backoff behavior
- Integration tests (mocked API):
  - successful credential verification
  - invalid credential response mapping

### Exit Criteria
- Credential flow is stable and secure.
- API client is reusable by all resources.

---

## Stage 2: Core Read/Low-Risk Operations
### Objectives
- Deliver read-focused operations first to de-risk integration.

### Implementation Tasks
- Implement operations:
  - Verify Payment
  - Get Transaction
  - List Transactions
  - Search Transactions
  - Get Virtual Account
- Implement pagination helpers and response mapping.
- Add input validation for references, filters, and paging params.

### Tests to Run
- Unit tests:
  - parameter validation per operation
  - response transformation consistency
  - pagination parameter handling
- Contract tests (mock server):
  - expected request path/query/body shape
  - expected parsed output shape
- Negative tests:
  - 401, 403, 404, 422, 429, 500 mapping to user-friendly errors
  - malformed payload handling

### Exit Criteria
- All read operations return correct typed outputs.
- Error behavior is predictable and documented.

---

## Stage 3: Write Operations with Idempotency Safety
### Objectives
- Implement money-affecting and account-creation operations safely.

### Implementation Tasks
- Implement operations:
  - Create Payment Link
  - Initiate Transfer
  - Verify Transfer
  - Create Refund
  - Create Virtual Account
- Add idempotency key strategy:
  - generated when missing
  - reuse reference where applicable
  - duplicate detection behavior
- Add strict business validation for amounts/currency/phone.

### Tests to Run
- Unit tests:
  - idempotency key generation and reuse
  - amount/currency/phone validation
  - reference uniqueness handling logic
- Integration tests (mock API):
  - happy path for each write operation
  - duplicate submission returns safe deterministic result
  - retry does not create duplicate side effects
- Failure tests:
  - timeout then retry behavior
  - partial failure recovery behavior
  - 429 and transient 5xx retry correctness

### Exit Criteria
- No duplicate money movement under retries.
- Write operations are safe, validated, and deterministic.

---

## Stage 4: Trigger Node and Webhook Security
### Objectives
- Implement event-driven trigger with production-grade webhook security.

### Implementation Tasks
- Implement Nomba Trigger events:
  - Payment Successful
  - Payment Failed
  - Refund Created
  - Refund Completed
  - Transfer Completed
  - Transfer Failed
  - Virtual Account Funded
- Implement signature verification.
- Implement replay protection:
  - timestamp tolerance checks
  - nonce or event-id deduplication store
- Implement secret rotation support window.

### Tests to Run
- Unit tests:
  - signature verification pass/fail
  - constant-time comparison helper behavior
  - timestamp validation logic
  - deduplication logic
- Integration tests:
  - valid webhook accepted and emitted
  - invalid signature rejected
  - replayed event rejected
  - rotated secret accepted within overlap window
- Security tests:
  - tampered payload rejection
  - old timestamp rejection

### Exit Criteria
- Trigger node is secure against signature bypass and replay attacks.
- Event payloads are normalized and usable downstream.

---

## Stage 5: UX, Node Metadata, and Templates
### Objectives
- Make the node easy to use and demo-ready.

### Implementation Tasks
- Add operation descriptions, placeholders, examples, and categories.
- Add resource/operation display options and helpful hints.
- Create 7 importable workflow templates from PRD.
- Add polished README quick-start snippets.

### Tests to Run
- Functional tests:
  - every operation appears with correct labels and fields
  - required/optional field UI behavior
- Template tests:
  - each template imports without errors
  - each template executes with mocked or demo data
- Usability tests:
  - first workflow created within target 5 minutes by a fresh user
  - auth setup within target 2 minutes

### Exit Criteria
- End users can discover and run operations with minimal friction.
- All templates import and execute successfully.

---

## Stage 6: Documentation and Developer Experience
### Objectives
- Produce complete docs for users and contributors.

### Implementation Tasks
- Create docs:
  - Installation Guide
  - Authentication Guide
  - Quick Start
  - Node and operation reference
  - Webhook Guide
  - Troubleshooting and FAQ
  - Contribution Guide
  - Architecture notes
- Add example payloads and troubleshooting decision trees.

### Tests to Run
- Documentation tests:
  - follow Quick Start from zero to working flow
  - verify every operation has docs and example
  - verify webhook setup docs match implementation
- Link and consistency checks:
  - no broken internal links
  - terminology and event names consistent across docs/code

### Exit Criteria
- New user can install and execute first successful flow in under 10 minutes.
- Docs are complete, accurate, and internally consistent.

---

## Stage 7: Performance, Reliability, and Pre-Release Hardening
### Objectives
- Validate behavior under realistic load and failure conditions.

### Implementation Tasks
- Benchmark standard operations.
- Add reliability scenarios (network instability, rate limiting, API failures).
- Tighten logging and debug mode controls.
- Finalize release checklist and package validation.

### Tests to Run
- Performance tests:
  - operation overhead under 2 seconds excluding network latency
  - pagination performance with large datasets
- Reliability tests:
  - sustained retries under throttling
  - timeout and recovery scenarios
  - graceful degradation on upstream failures
- Regression tests:
  - full suite rerun (unit, integration, webhook, template)
- Release tests:
  - install package in clean n8n instance
  - import templates and run smoke flows

### Exit Criteria
- Release candidate meets non-functional requirements.
- No high-severity defects remain.

---

## Stage 8: Hackathon Demo and Launch Readiness
### Objectives
- Ensure stable demo and safe post-hackathon continuation.

### Implementation Tasks
- Build deterministic demo workflow path.
- Prepare fallback mode with mock data if external API is unstable.
- Record demo video and final architecture diagram.
- Final risk review and go/no-go checklist.

### Tests to Run
- Demo tests:
  - full demo run-through passes 3 consecutive times
  - offline fallback demo path works
- Release readiness tests:
  - package build and install validation
  - critical security checks pass
  - critical documentation links and commands verified

### Exit Criteria
- Team can demo confidently with recovery options.
- Artifact bundle is complete for submission.

---

## Test Strategy Matrix
- Unit Tests: validation, formatting, mapping, retry logic, idempotency helpers, signature helpers.
- Integration Tests (Mock API): endpoint behavior, error mapping, retries, write safety.
- Webhook Security Tests: signature, replay, timestamp, secret rotation.
- Template Tests: import, execution, expected outputs.
- End-to-End Smoke Tests: install, authenticate, create flow, trigger event, downstream action.
- Non-Functional Tests: performance, reliability, resilience under throttling.

## Quality Gates (Must Pass)
- 0 lint errors.
- 0 type errors.
- 100% pass rate on critical test suite.
- No unresolved high severity security defects.
- All required docs complete.

## Suggested Milestone Timeline (Hackathon Mode)
- Day 1: Stage 0-1
- Day 2: Stage 2-3
- Day 3: Stage 4-5
- Day 4: Stage 6-7
- Day 5: Stage 8 and submission

## Risk Register and Mitigation
- Nomba API instability: use retries, fallback mocks, deterministic demo data.
- Scope creep: enforce Must/Should/Could plan.
- Security regressions: mandatory webhook/idempotency security tests before release.
- Integration drift: lock contract tests to expected request/response schemas.

## Ownership Checklist (Per Stage)
- Engineering owner assigned.
- QA owner assigned.
- Documentation owner assigned.
- Stage completion evidence attached (test outputs and checklist).
