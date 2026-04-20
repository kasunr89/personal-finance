import { exec } from 'child_process';
import { startAuth } from '../src/adapters/banks/enablebanking/enablebanking-provider';

const REDIRECT_PORT = 3000;
const REDIRECT_URL = `http://localhost:${REDIRECT_PORT}/callback`;

// How many days to request access for (PSD2 max is typically 90-180)
const ACCESS_DAYS = 90;

async function main() {
  const aspsp = { name: 'LHV Pank', country: 'EE' };

  const validUntil = new Date(
    Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  console.log(`Starting auth session with ${aspsp.name}...`);
  const auth = await startAuth(aspsp, REDIRECT_URL, validUntil);

  console.log('\nOpen this URL in your browser to authorize:\n');
  console.log(auth.url);
  console.log();
  console.log('Make sure the dev server is running (npm run dev) — the');
  console.log(`/callback response will show the session ID and account UIDs.`);

  // Auto-open on macOS
  exec(`open "${auth.url}"`);
}

main().catch((err) => {
  console.error('Authorization failed:', err);
  process.exit(1);
});
