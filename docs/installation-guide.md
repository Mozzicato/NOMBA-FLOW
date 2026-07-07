# Installation Guide

## Requirements
- Node.js 20+
- npm 10+
- n8n instance (cloud or self-hosted)

## Install Dependencies (development)
```bash
npm install
```

## Build and Validate
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Use as n8n Community Node (local testing)
1. Build the package.
2. Point your n8n custom node path to this package build output.
3. Restart n8n and confirm Nomba and Nomba Trigger appear in the node list.

## Environment Safety
- Never commit secrets.
- Keep credentials in n8n credential store only.
- Keep docs/technical_keys.md out of version control for shared repos.
