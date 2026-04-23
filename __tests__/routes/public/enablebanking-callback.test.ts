import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { EnableBankingAuthProvider, EnableBankingSession } from '../../../src/ports/enablebanking-auth-provider.js';

const mockSession: EnableBankingSession = {
	status: 'AUTHORIZED',
	accounts: ['acc-1'],
	accounts_data: [{ uid: 'acc-1', identification_hash: 'hash1', identification_hashes: ['hash1'] }],
	aspsp: { name: 'Test Bank', country: 'EE' },
	psu_type: 'personal',
	psu_id_hash: 'psuhash',
	access: { accounts: ['acc-1'], balances: true, transactions: true, valid_until: '2026-07-01' },
	created: '2026-04-23T00:00:00Z',
	authorized: '2026-04-23T00:00:00Z',
	closed: null,
};

function makeMockProvider(overrides?: Partial<EnableBankingAuthProvider>): EnableBankingAuthProvider {
	return {
		startAuth: mock.fn(async () => ({ url: '' })),
		createSession: mock.fn(async () => mockSession),
		getSession: mock.fn(async () => mockSession),
		deleteSession: mock.fn(async () => {}),
		...overrides,
	};
}

describe('GET /callback', () => {
	it('returns 400 when code is missing', async () => {
		const app = Fastify();
		const { enableBankingCallbackRoute } =
			await import('../../../src/infrastructure/routes/public/enablebanking-callback.js');
		app.register(enableBankingCallbackRoute, { provider: makeMockProvider() });

		const response = await app.inject({ method: 'GET', url: '/callback' });
		assert.equal(response.statusCode, 400);
		assert.deepEqual(JSON.parse(response.body), { error: 'Missing code parameter' });
	});

	it('returns accounts when code is valid', async () => {
		const provider = makeMockProvider();

		const app = Fastify();
		const { enableBankingCallbackRoute } =
			await import('../../../src/infrastructure/routes/public/enablebanking-callback.js');
		app.register(enableBankingCallbackRoute, { provider });

		const response = await app.inject({ method: 'GET', url: '/callback?code=auth-code-123' });
		assert.equal(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.deepEqual(body.accounts, ['acc-1']);
		assert.equal(body.accounts_data[0].uid, 'acc-1');
	});

	it('returns 500 when createSession throws', async () => {
		const provider = makeMockProvider({
			createSession: mock.fn(async () => { throw new Error('session error'); }),
		});

		const app = Fastify({ logger: false });
		const { enableBankingCallbackRoute } =
			await import('../../../src/infrastructure/routes/public/enablebanking-callback.js');
		app.register(enableBankingCallbackRoute, { provider });

		const response = await app.inject({ method: 'GET', url: '/callback?code=bad-code' });
		assert.equal(response.statusCode, 500);
	});
});
