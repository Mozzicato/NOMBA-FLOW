/*
 * Sends a Nomba-style webhook to the local receiver: one correctly signed
 * (expect 200) and one with a bad signature (expect 401).
 *
 * Usage:  node scripts/send-test-webhook.cjs [url]
 *   default url: http://localhost:3000/webhook/nomba
 */
const { createHmac } = require('node:crypto');

const URL = process.argv[2] || 'http://localhost:3000/webhook/nomba';
const KEY = process.env.NOMBA_WEBHOOK_KEY || 'NombaHackathon2026';
const timestamp = new Date().toISOString();

const body = {
  event_type: 'payment_success',
  requestId: 'req-local-test-1',
  data: {
    merchant: { walletId: 'w-1', userId: 'u-1' },
    transaction: {
      transactionId: 'tx-local-1',
      type: 'vact_transfer',
      time: timestamp,
      responseCode: '',
      transactionAmount: 120,
    },
  },
};

function sign(key) {
  const payload = [
    body.event_type,
    body.requestId,
    body.data.merchant.userId,
    body.data.merchant.walletId,
    body.data.transaction.transactionId,
    body.data.transaction.type,
    body.data.transaction.time,
    body.data.transaction.responseCode,
    timestamp,
  ].join(':');
  return createHmac('sha256', key).update(payload, 'utf8').digest('base64');
}

async function post(signature, label) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'nomba-signature': signature,
      'nomba-timestamp': timestamp,
      'nomba-signature-algorithm': 'HmacSHA256',
    },
    body: JSON.stringify(body),
  });
  console.log(`${label}: HTTP ${res.status} ${JSON.stringify(await res.json())}`);
}

(async () => {
  await post(sign(KEY), 'valid signature   ');
  await post(sign('wrong-key'), 'tampered signature');
})();
