import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankSession } from '../../../src/domain/types.js';
import type { EnableBankingGateway } from '../../../src/ports/enablebanking-gateway.js';

const mockSession: BankSession = {
	status: 'AUTHORIZED',
	accounts: ['acc-1'],
	accountsData: [{ uid: 'acc-1', identificationHash: 'hash1' }],
	validUntil: '2026-07-01',
};

function makeMockProvider(
	overrides?: Partial<EnableBankingGateway>,
): EnableBankingGateway {
	return {
		startAuth: mock.fn(async () => ({ url: '' })),
		createSession: mock.fn(async () => mockSession),
		getSession: mock.fn(async () => mockSession),
		deleteSession: mock.fn(async () => {}),
		getAllTransactions: mock.fn(async () => []),
		...overrides,
	};
}

describe('GET /callback', () => {
	it('returns 400 when code is missing', async () => {
		const app = Fastify();
		const { getEnableBankingCallbackRoute } =
			await import('../../../src/infrastructure/routes/public/get-enablebanking-callback.js');
		app.register(getEnableBankingCallbackRoute, {
			provider: makeMockProvider(),
		});

		const response = await app.inject({ method: 'GET', url: '/callback' });
		assert.equal(response.statusCode, 400);
		assert.deepEqual(JSON.parse(response.body), {
			error: 'Missing code parameter',
		});
	});

	it('returns accounts when code is valid', async () => {
		const provider = makeMockProvider();

		const app = Fastify();
		const { getEnableBankingCallbackRoute } =
			await import('../../../src/infrastructure/routes/public/get-enablebanking-callback.js');
		app.register(getEnableBankingCallbackRoute, { provider });

		const response = await app.inject({
			method: 'GET',
			url: '/callback?code=auth-code-123',
		});
		assert.equal(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.deepEqual(body.accounts, ['acc-1']);
		assert.equal(body.accountsData[0].uid, 'acc-1');
	});

	it('returns 500 when createSession throws', async () => {
		const provider = makeMockProvider({
			createSession: mock.fn(async () => {
				throw new Error('session error');
			}),
		});

		const app = Fastify({ logger: false });
		const { getEnableBankingCallbackRoute } =
			await import('../../../src/infrastructure/routes/public/get-enablebanking-callback.js');
		app.register(getEnableBankingCallbackRoute, { provider });

		const response = await app.inject({
			method: 'GET',
			url: '/callback?code=bad-code',
		});
		assert.equal(response.statusCode, 500);
	});
});
