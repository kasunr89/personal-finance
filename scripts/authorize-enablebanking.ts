import http from 'http';
import { exec } from 'child_process';
import { startAuth, createSession } from '../src/enablebanking-client.js';

const REDIRECT_PORT = 3000;
const REDIRECT_PATH = '/callback';
// const REDIRECT_URL = `http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`;
const REDIRECT_URL = 'https://tower-stroke-alot-arrangements.trycloudflare.com/callback';

// How many days to request access for (PSD2 max is typically 90-180)
const ACCESS_DAYS = 90;

async function waitForCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${REDIRECT_PORT}`);
      if (url.pathname !== REDIRECT_PATH) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      if (!code) {
        res.writeHead(400);
        res.end('Missing code parameter');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorization successful!</h1><p>You can close this tab.</p>');
      server.close();
      resolve(code);
    });

    server.on('error', reject);
    server.listen(REDIRECT_PORT, () => {
      console.log(`Listening on http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`);
    });
  });
}

async function main() {
  const useMock = process.argv.includes('--mock');
  const aspsp = useMock
    ? { name: 'Mock ASPSP', country: 'EE' }
    : { name: 'LHV Pank', country: 'EE' };

  const validUntil = new Date(
    Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  console.log(`Starting auth session with ${aspsp.name}...`);
  const auth = await startAuth(aspsp, REDIRECT_URL, validUntil);

  console.log('\nOpen this URL in your browser to authorize:\n');
  console.log(auth.url);
  console.log();

  // Auto-open on macOS
  exec(`open "${auth.url}"`);

  console.log('Waiting for callback...');
  const code = await waitForCode();

  console.log('Exchanging code for session...');
  const session = await createSession(code);

  console.log('\n--- Authorization complete ---');
  console.log(`Session ID: ${session.session_id}`);
  console.log(`Valid until: ${validUntil}`);
  console.log('Accounts:');
  for (const account of session.accounts) {
    console.log(`  - ${account.uid}${account.iban ? ` (${account.iban})` : ''}`);
  }

  console.log('\nSave these values to your .env or database:');
  console.log(`ENABLEBANKING_SESSION_ID=${session.session_id}`);
  for (let i = 0; i < session.accounts.length; i++) {
    console.log(`ENABLEBANKING_ACCOUNT_UID_${i}=${session.accounts[i].uid}`);
  }
}

main().catch((err) => {
  console.error('Authorization failed:', err);
  process.exit(1);
});
