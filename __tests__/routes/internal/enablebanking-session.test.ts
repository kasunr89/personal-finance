import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type {
	EnableBankingAuthProvider,
	EnableBankingSession,
} from '../../../src/ports/enablebanking-auth-provider.js';

const mockSession: EnableBankingSession = {
	status: 'AUTHORIZED',
	accounts: ['acc-1'],
	accounts_data: [
		{
			uid: 'acc-1',
			identification_hash: 'hash1',
			identification_hashes: ['hash1'],
		},
	],
	aspsp: { name: 'Test Bank', country: 'EE' },
	psu_type: 'personal',
	psu_id_hash: 'psuhash',
	access: {
		accounts: ['acc-1'],
		balances: true,
		transactions: true,
		valid_until: '2026-07-01',
	},
	created: '2026-04-23T00:00:00Z',
	authorized: '2026-04-23T00:00:00Z',
	closed: null,
};

function makeMockProvider(
	overrides?: Partial<EnableBankingAuthProvider>,
): EnableBankingAuthProvider {
	return {
		startAuth: mock.fn(async () => ({ url: '' })),
		createSession: mock.fn(async () => mockSession),
		getSession: mock.fn(async () => mockSession),
		deleteSession: mock.fn(async () => {}),
		...overrides,
	};
}

describe('GET /enablebanking/sessions/:sessionId', () => {
	it('returns session data for the given sessionId', async () => {
		const provider = makeMockProvider();

		const app = Fastify();
		const { enableBankingSessionRoute } =
			await import('../../../src/infrastructure/routes/internal/enablebanking-session.js');
		app.register(enableBankingSessionRoute, { provider });

		const response = await app.inject({
			method: 'GET',
			url: '/enablebanking/sessions/sess-123',
		});
		assert.equal(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.equal(body.status, 'AUTHORIZED');
		assert.deepEqual(body.accounts, ['acc-1']);
		assert.equal(body.closed, null);
	});

	it('returns 500 when provider throws', async () => {
		const provider = makeMockProvider({
			getSession: mock.fn(async () => {
				throw new Error('upstream error');
			}),
		});

		const app = Fastify({ logger: false });
		const { enableBankingSessionRoute } =
			await import('../../../src/infrastructure/routes/internal/enablebanking-session.js');
		app.register(enableBankingSessionRoute, { provider });

		const response = await app.inject({
			method: 'GET',
			url: '/enablebanking/sessions/sess-123',
		});
		assert.equal(response.statusCode, 500);
	});
});
