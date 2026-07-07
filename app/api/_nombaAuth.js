const BASE_URLS = {
  production: 'https://api.nomba.com',
  sandbox: 'https://sandbox.nomba.com',
};

export async function issueNombaToken() {
  const clientId = process.env.NOMBA_CLIENT_ID;
  const clientSecret = process.env.NOMBA_CLIENT_SECRET;
  const accountId = process.env.NOMBA_ACCOUNT_ID;
  const env = process.env.NOMBA_ENV === 'sandbox' ? 'sandbox' : 'production';

  if (!clientId || !clientSecret || !accountId) {
    throw new Error('Missing Nomba credentials in environment');
  }

  const url = new URL('/v1/auth/token/issue', BASE_URLS[env]);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accountId },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const body = await response.json();
  if (!response.ok || !body?.data?.access_token) {
    throw new Error(body?.description || `Nomba auth failed (${response.status})`);
  }

  return {
    accessToken: body.data.access_token,
    expiresAt: body.data.expiresAt,
    accountId,
    environment: env,
  };
}
