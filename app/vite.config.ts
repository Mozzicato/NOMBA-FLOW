import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { issueNombaToken } from './api/_nombaAuth.js';

function nombaApiDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'nomba-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/verify-payment', async (req, res) => {
        for (const [key, value] of Object.entries(env)) {
          if (key.startsWith('NOMBA_')) process.env[key] = value;
        }
        try {
          const { expiresAt, accountId, environment } = await issueNombaToken();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ connected: true, accountId, environment, tokenExpiresAt: expiresAt }));
        } catch (error) {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              connected: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          );
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'NOMBA_');
  return {
    plugins: [react(), nombaApiDevPlugin(env)],
    server: { port: 5173 },
  };
});
