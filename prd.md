# Product Requirements Document (PRD)

# Project Name

**Nomba Flow**

**Tagline:** *Automate payments. Connect everything.*

---

# Overview

Nomba Flow is a production-grade n8n Community Node that enables businesses and developers to integrate Nomba's payment ecosystem into automated workflows without writing custom backend code.

The project aims to make Nomba a first-class automation platform by allowing users to drag-and-drop Nomba actions into n8n workflows alongside hundreds of existing integrations.

Rather than simply exposing API endpoints, the integration should provide a polished developer experience with authentication, validation, error handling, documentation, workflow templates, and production-ready packaging.

---

# Vision

Make Nomba the easiest Nigerian payment provider to automate.

A merchant should be able to create workflows such as:

"When payment succeeds -> Update CRM -> Generate Invoice -> Send WhatsApp confirmation -> Notify Finance"

without writing any backend code.

---

# Primary Users

## Developers

Need to integrate Nomba into existing systems quickly.

Goals

* Reduce coding effort
* Build automations
* Connect Nomba with existing software

---

## SMEs

Need to automate operations after receiving payments.

Goals

* Reduce manual reconciliation
* Save time
* Improve operational efficiency

---

## Finance Teams

Need reliable payment automation.

Goals

* Automatic reconciliation
* Refund workflows
* Reports
* Notifications

---

# Success Metrics

The project should demonstrate:

* Installation within 5 minutes
* Authentication within 2 minutes
* First successful workflow within 5 minutes
* Clean documentation with a complete Quick Start path
* Production-ready code quality validated by CI (lint, type-check, test, build)

---

# Functional Requirements

## Authentication

Support:

* Secret API Key
* Public API Key (where applicable)

Store credentials securely using n8n credential system.

Validation:

* Missing credentials
* Invalid credentials
* Expired credentials

Display meaningful errors.

---

# Resource Nodes

Create a single Nomba node with multiple resources.

Resources:

* Checkout
* Transactions
* Transfers
* Refunds
* Virtual Accounts

---

# Operations

## Checkout

### Create Payment Link

Inputs

* Amount
* Currency
* Customer Name
* Customer Email
* Customer Phone
* Reference
* Callback URL
* Metadata

Outputs

* Payment Link
* Checkout ID
* Reference

---

## Verify Payment

Input

Reference

Output

* Status
* Amount
* Customer
* Payment Method
* Date
* Raw API response

---

## Transactions

### Get Transaction

Input

Reference

Output

Complete transaction object

---

### List Transactions

Filters

* Date range
* Status
* Customer
* Pagination

---

### Search Transactions

Support

* Reference
* Email
* Phone

---

## Refunds

### Create Refund

Input

Transaction Reference

Refund Amount

Reason

Output

Refund Status

---

## Transfers

### Initiate Transfer

Inputs

Recipient

Bank Code

Amount

Narration

Reference

Output

Transfer Status

---

### Verify Transfer

Input

Transfer Reference

Output

Transfer details

---

## Virtual Accounts

### Create Virtual Account

Inputs

Customer Name

Email

Phone

BVN (optional)

Metadata

Outputs

Account Number

Bank Name

Account Name

Reference

---

### Get Virtual Account

Input

Account Reference

---

# Operation Contracts

All operations must define and document:

* Required vs optional input fields.
* Field-level validation rules and examples.
* Response shape returned by the node.
* Error shape returned by the node.
* Pagination behavior (page/limit/cursor, defaults, maximums).
* Timeout behavior and retryability guidance.

Write operations (create checkout, initiate transfer, create refund, create virtual account) must include idempotency behavior and conflict handling.

---

# Trigger Node

Create:

"Nomba Trigger"

Events

* Payment Successful
* Payment Failed
* Refund Created
* Refund Completed
* Transfer Completed
* Transfer Failed
* Virtual Account Funded

Webhook Verification

Must verify signatures using Nomba's documented signing method.

Must reject invalid requests with clear HTTP status codes.

Must enforce replay protection (timestamp tolerance and nonce/event-id deduplication).

Must support secret rotation with a configurable overlap window.

---

# Credential Management

Implement

"Nomba Credentials"

Store securely.

Test Connection button.

Return

Connected successfully.

or

Invalid credentials.

---

# Error Handling

Every operation should gracefully handle:

401

403

404

422

429

500

Timeouts

Network failures

Invalid payloads

Show user-friendly errors.

---

# Retry Logic

Retry:

* Network failures
* HTTP 429
* Temporary server errors

Use exponential backoff with jitter.

Retry policy:

* Default max retries: 3
* Initial delay: 500ms
* Backoff multiplier: 2
* Maximum delay: 10s

Do not retry client errors (4xx) except 429.

---

# Idempotency

Write operations must be idempotent to prevent duplicate money movement.

Requirements:

* Generate and send idempotency keys where API supports it.
* Reuse user-supplied references as idempotency keys where appropriate.
* On retry, detect duplicates and return the original operation result when possible.
* Document duplicate-handling behavior per operation.

---

# Validation

Validate

Amounts

Required fields

Email

Phone

URLs

References

Prevent invalid requests.

Enforce business rules:

* Amounts must be positive and respect currency minimum units.
* Currency codes must be ISO 4217-compliant where applicable.
* Phone numbers should be E.164 format when required by endpoint.

---

# User Experience

Each node should have:

Description

Examples

Helpful placeholder text

Validation

Icons

Categories

Search keywords

---

# Workflow Templates

Include importable workflows.

---

## Template 1

Payment Successful

->

Google Sheets

->

Append payment

---

## Template 2

Payment Successful

->

Slack

->

Notify finance

---

## Template 3

Payment Successful

->

Send Email

->

Receipt

---

## Template 4

Payment Successful

->

Airtable

->

Create customer record

---

## Template 5

Virtual Account Funded

->

Verify Amount

->

Update Database

->

Notify Customer

---

## Template 6

Refund Completed

->

Update CRM

->

Notify Support

---

## Template 7

Transfer Completed

->

Send WhatsApp

->

Archive

---

# Documentation

Provide:

Installation Guide

Authentication Guide

Quick Start

Node Reference

Every Operation

Example Workflows

Webhook Guide

Troubleshooting

FAQ

Contribution Guide

Architecture

---

# Repository Structure

```
/
docs
examples
credentials
nodes
triggers
utils
tests
assets
.github

README.md

LICENSE
```

---

# Testing

Unit Tests

Credential tests

API tests

Webhook tests

Validation tests

Retry tests

Error tests

---

# CI/CD

GitHub Actions

Run

Lint

Type Check

Tests

Build

---

# Logging

Development logging

Debug mode

Never expose secrets.

---

# Security

Never log API keys.

Mask secrets.

Verify webhook signatures.

Enforce webhook replay protection.

Use constant-time signature comparison.

Allow secure secret rotation.

Validate inputs.

Sanitize outputs.

---

# Non-functional Requirements

Performance

Node execution under 2 seconds for standard operations (excluding network latency).

Availability

Gracefully handle temporary API failures.

Maintainability

Modular code.

Strong typing.

Reusable API client.

Scalability

Easy to add future Nomba endpoints.

---

# Scope and Prioritization

Must-have (MVP):

* Credentials, checkout, transaction verification, refund creation, transfer initiation/verification, virtual account create/get.
* Trigger node with secure webhook verification and replay protection.
* Core docs (installation, auth, quick start, troubleshooting).
* CI pipeline (lint, type-check, tests, build).

Should-have:

* Seven workflow templates.
* Dynamic dropdowns for supported list fields (for example bank codes).
* Extended troubleshooting and FAQ content.

Could-have:

* CSV export helpers.
* Batch operations.
* AI-generated workflow descriptions.

Out of scope for this release:

* OAuth unless Nomba makes it available.
* Features requiring undocumented/private Nomba APIs.

---

# Nice-to-Have Features

* OAuth support if Nomba introduces it.
* Dynamic dropdowns for banks and transfer recipients.
* Automatic pagination helpers.
* Batch operations.
* Export transactions to CSV.
* Built-in retry node examples.
* AI-generated workflow descriptions.

---

# Demo Scenario

1. Install the Nomba Flow node.
2. Configure Nomba credentials.
3. Create a workflow:

   * Manual Trigger
   * Create Payment Link
   * Send Email with payment link.
4. Simulate payment.
5. Nomba Trigger receives webhook.
6. Verify payment.
7. Append transaction to Google Sheets.
8. Send Slack notification.
9. Display successful execution in n8n.

---

# Deliverables

* Production-ready n8n Community Node.
* Secure credential provider.
* Webhook Trigger Node.
* Seven reusable workflow templates.
* Full documentation.
* Automated tests.
* Docker development environment.
* CI/CD pipeline.
* Demo video.
* Architecture diagram.
* Installation guide.

---

# Definition of Done

The project is considered complete when:

* All planned Nomba operations function correctly.
* Authentication is secure and reliable.
* Webhooks are verified.
* Webhooks are replay-safe and support secret rotation.
* Write operations are idempotent and safe under retries.
* Documentation allows a new user to complete setup in under 10 minutes.
* Workflow templates import successfully.
* Automated tests pass.
* The package builds successfully.
* The integration is polished enough to be submitted to the n8n Community Nodes ecosystem and demonstrated confidently during the hackathon.
