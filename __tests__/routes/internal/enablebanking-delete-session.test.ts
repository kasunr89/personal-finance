import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { EnableBankingAuthProvider, EnableBankingSession } from '../../../src/ports/enablebanking-auth-provider.js';

function makeMockProvider(overrides?: Partial<EnableBankingAuthProvider>): EnableBankingAuthProvider {
	return {
		startAuth: mock.fn(async () => ({ url: '' })),
		createSession: mock.fn(async () => ({} as EnableBankingSession)),
		getSession: mock.fn(async () => ({} as EnableBankingSession)),
		deleteSession: mock.fn(async () => {}),
		...overrides,
	};
}

describe('DELETE /enablebanking/sessions/:sessionId', () => {
	it('returns 204 on successful deletion', async () => {
		const provider = makeMockProvider();

		const app = Fastify();
		const { enableBankingDeleteSessionRoute } =
			await import('../../../src/infrastructure/routes/internal/enablebanking-delete-session.js');
		app.register(enableBankingDeleteSessionRoute, { provider });

		const response = await app.inject({
			method: 'DELETE',
			url: '/enablebanking/sessions/sess-123',
		});
		assert.equal(response.statusCode, 204);
	});

	it('returns 500 when provider throws', async () => {
		const provider = makeMockProvider({
			deleteSession: mock.fn(async () => { throw new Error('delete failed'); }),
		});

		const app = Fastify({ logger: false });
		const { enableBankingDeleteSessionRoute } =
			await import('../../../src/infrastructure/routes/internal/enablebanking-delete-session.js');
		app.register(enableBankingDeleteSessionRoute, { provider });

		const response = await app.inject({
			method: 'DELETE',
			url: '/enablebanking/sessions/sess-123',
		});
		assert.equal(response.statusCode, 500);
	});
});
