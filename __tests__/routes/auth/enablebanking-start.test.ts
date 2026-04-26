import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankSession } from '../../../src/domain/types.js';
import type { EnableBankingGateway } from '../../../src/ports/enablebanking-gateway.js';

process.env.REDIRECT_HOST = 'https://example.com';

function makeMockProvider(
	overrides?: Partial<EnableBankingGateway>,
): EnableBankingGateway {
	return {
		startAuth: mock.fn(async () => ({ url: 'https://bank.example/auth' })),
		createSession: mock.fn(async () => ({}) as BankSession),
		getSession: mock.fn(async () => ({}) as BankSession),
		deleteSession: mock.fn(async () => {}),
		getAllTransactions: mock.fn(async () => []),
		...overrides,
	};
}

describe('GET /enablebanking/start', () => {
	it('returns the bank authorization URL', async () => {
		const provider = makeMockProvider();

		const app = Fastify();
		const { getEnableBankingStartRoute } =
			await import('../../../src/infrastructure/routes/auth/get-enablebanking-start.js');
		app.register(getEnableBankingStartRoute, { provider });

		const response = await app.inject({
			method: 'GET',
			url: '/enablebanking/start',
		});
		assert.equal(response.statusCode, 200);
		assert.deepEqual(JSON.parse(response.body), {
			url: 'https://bank.example/auth',
		});
	});

	it('returns 500 when provider throws', async () => {
		const provider = makeMockProvider({
			startAuth: mock.fn(async () => {
				throw new Error('auth failed');
			}),
		});

		const app = Fastify({ logger: false });
		const { getEnableBankingStartRoute } =
			await import('../../../src/infrastructure/routes/auth/get-enablebanking-start.js');
		app.register(getEnableBankingStartRoute, { provider });

		const response = await app.inject({
			method: 'GET',
			url: '/enablebanking/start',
		});
		assert.equal(response.statusCode, 500);
	});
});
