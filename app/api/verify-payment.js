import { issueNombaToken } from './_nombaAuth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ connected: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { expiresAt, accountId, environment } = await issueNombaToken();
    res.status(200).json({
      connected: true,
      accountId,
      environment,
      tokenExpiresAt: expiresAt,
    });
  } catch (error) {
    res.status(200).json({ connected: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
