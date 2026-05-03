import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankSession } from '../../../src/domain/types.js';
import type { EnableBankingSessionGateway } from '../../../src/ports/enablebanking-session-gateway.js';

process.env.REDIRECT_HOST = 'https://example.com';

function makeSessionGateway(
	overrides?: Partial<EnableBankingSessionGateway>,
): EnableBankingSessionGateway {
	return {
		startAuth: mock.fn(async () => ({ url: 'https://bank.example/auth' })),
		createSession: mock.fn(async () => ({}) as BankSession),
		getSession: mock.fn(async () => ({}) as BankSession),
		deleteSession: mock.fn(async () => {}),
		...overrides,
	};
}

describe('GET /enablebanking/start', () => {
	it('returns the bank authorization URL', async () => {
		const sessionGateway = makeSessionGateway();

		const app = Fastify();
		const { getEnableBankingStartRoute } =
			await import('../../../src/infrastructure/routes/auth/get-enablebanking-start.js');
		app.register(getEnableBankingStartRoute, { sessionGateway });

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
		const sessionGateway = makeSessionGateway({
			startAuth: mock.fn(async () => {
				throw new Error('auth failed');
			}),
		});

		const app = Fastify({ logger: false });
		const { getEnableBankingStartRoute } =
			await import('../../../src/infrastructure/routes/auth/get-enablebanking-start.js');
		app.register(getEnableBankingStartRoute, { sessionGateway });

		const response = await app.inject({
			method: 'GET',
			url: '/enablebanking/start',
		});
		assert.equal(response.statusCode, 500);
	});
});
