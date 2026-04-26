import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankSession } from '../../../src/domain/types.js';
import type { EnableBankingSessionGateway } from '../../../src/ports/enablebanking-session-gateway.js';

function makeMockProvider(
	overrides?: Partial<EnableBankingSessionGateway>,
): EnableBankingSessionGateway {
	return {
		startAuth: mock.fn(async () => ({ url: '' })),
		createSession: mock.fn(async () => ({}) as BankSession),
		getSession: mock.fn(async () => ({}) as BankSession),
		deleteSession: mock.fn(async () => {}),
		...overrides,
	};
}

describe('DELETE /enablebanking/sessions/:sessionId', () => {
	it('returns 204 on successful deletion', async () => {
		const provider = makeMockProvider();

		const app = Fastify();
		const { deleteEnableBankingSessionRoute } =
			await import('../../../src/infrastructure/routes/internal/delete-enablebanking-session.js');
		app.register(deleteEnableBankingSessionRoute, { provider });

		const response = await app.inject({
			method: 'DELETE',
			url: '/enablebanking/sessions/sess-123',
		});
		assert.equal(response.statusCode, 204);
	});

	it('returns 500 when provider throws', async () => {
		const provider = makeMockProvider({
			deleteSession: mock.fn(async () => {
				throw new Error('delete failed');
			}),
		});

		const app = Fastify({ logger: false });
		const { deleteEnableBankingSessionRoute } =
			await import('../../../src/infrastructure/routes/internal/delete-enablebanking-session.js');
		app.register(deleteEnableBankingSessionRoute, { provider });

		const response = await app.inject({
			method: 'DELETE',
			url: '/enablebanking/sessions/sess-123',
		});
		assert.equal(response.statusCode, 500);
	});
});
