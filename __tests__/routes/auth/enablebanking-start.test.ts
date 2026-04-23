import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { EnableBankingAuthProvider, EnableBankingSession } from '../../../src/ports/enablebanking-auth-provider.js';

process.env.REDIRECT_HOST = 'https://example.com';

function makeMockProvider(overrides?: Partial<EnableBankingAuthProvider>): EnableBankingAuthProvider {
	return {
		startAuth: mock.fn(async () => ({ url: 'https://bank.example/auth' })),
		createSession: mock.fn(async () => ({} as EnableBankingSession)),
		getSession: mock.fn(async () => ({} as EnableBankingSession)),
		deleteSession: mock.fn(async () => {}),
		...overrides,
	};
}

describe('GET /enablebanking/start', () => {
	it('returns the bank authorization URL', async () => {
		const provider = makeMockProvider();

		const app = Fastify();
		const { enableBankingStartRoute } =
			await import('../../../src/infrastructure/routes/auth/enablebanking-start.js');
		app.register(enableBankingStartRoute, { provider });

		const response = await app.inject({ method: 'GET', url: '/enablebanking/start' });
		assert.equal(response.statusCode, 200);
		assert.deepEqual(JSON.parse(response.body), { url: 'https://bank.example/auth' });
	});

	it('returns 500 when provider throws', async () => {
		const provider = makeMockProvider({
			startAuth: mock.fn(async () => { throw new Error('auth failed'); }),
		});

		const app = Fastify({ logger: false });
		const { enableBankingStartRoute } =
			await import('../../../src/infrastructure/routes/auth/enablebanking-start.js');
		app.register(enableBankingStartRoute, { provider });

		const response = await app.inject({ method: 'GET', url: '/enablebanking/start' });
		assert.equal(response.statusCode, 500);
	});
});
