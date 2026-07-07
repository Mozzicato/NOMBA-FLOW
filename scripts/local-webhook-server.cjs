/*
 * Standalone Nomba webhook receiver.
 *
 * Reuses the SAME signature verification the n8n Nomba Trigger node uses
 * (dist/src/utils/signature.js), so behaviour is identical. No n8n, no native
 * deps — just Node core. Use it to get a working, signature-verifying webhook
 * URL you can tunnel (cloudflared/ngrok) and submit to Nomba.
 *
 * Usage:
 *   npm run build           # ensure dist/ is fresh
 *   NOMBA_WEBHOOK_KEY=NombaHackathon2026 node scripts/local-webhook-server.cjs
 *
 * Then expose it:  cloudflared tunnel --url http://localhost:3000
 */
const http = require('node:http');
const { verifyWebhookSignature } = require('../dist/src/utils/signature');

const PORT = Number(process.env.PORT || 3000);
const SIGNING_KEY = process.env.NOMBA_WEBHOOK_KEY || 'NombaHackathon2026';
const VERIFY = process.env.VERIFY_SIGNATURE !== 'false';

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || !req.url.startsWith('/webhook/nomba')) {
    res.writeHead(404).end('Not found');
    return;
  }

  const raw = await readBody(req);
  let body;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    res.writeHead(400).end(JSON.stringify({ message: 'Invalid JSON' }));
    return;
  }

  const signature = req.headers['nomba-signature'];
  const timestamp = req.headers['nomba-timestamp'];

  if (VERIFY) {
    const ok = verifyWebhookSignature(body, SIGNING_KEY, signature, timestamp);
    if (!ok) {
      console.warn(`[REJECTED] bad signature  event=${body.event_type} req=${body.requestId}`);
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: 'Invalid Nomba webhook signature' }));
      return;
    }
  }

  console.log(`[ACCEPTED] event=${body.event_type} req=${body.requestId} tx=${body?.data?.transaction?.transactionId ?? ''}`);
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ received: true }));
});

server.listen(PORT, () => {
  console.log(`Nomba webhook receiver listening on http://localhost:${PORT}/webhook/nomba`);
  console.log(`Signature verification: ${VERIFY ? 'ON' : 'OFF'}`);
});
