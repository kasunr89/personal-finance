import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankSession } from '../../../src/domain/types.js';
import type { EnableBankingSessionGateway } from '../../../src/ports/enablebanking-session-gateway.js';
import type { EnablebankingSession, SessionRepo } from '../../../src/ports/session-repo.js';

function makeSessionGateway(
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

function makeSessionRepo(overrides?: Partial<SessionRepo>): SessionRepo {
	return {
		getAll: mock.fn(async () => [] as EnablebankingSession[]),
		getByConnector: mock.fn(async () => [] as EnablebankingSession[]),
		upsert: mock.fn(async () => {}),
		deleteById: mock.fn(async () => {}),
		deleteByConnector: mock.fn(async () => {}),
		...overrides,
	};
}

describe('DELETE /enablebanking/sessions/:sessionId', () => {
	it('returns 204 on successful deletion', async () => {
		const app = Fastify();
		const { deleteEnableBankingSessionRoute } =
			await import('../../../src/infrastructure/routes/internal/delete-enablebanking-session.js');
		app.register(deleteEnableBankingSessionRoute, {
			sessionGateway: makeSessionGateway(),
			sessionRepo: makeSessionRepo(),
		});

		const response = await app.inject({
			method: 'DELETE',
			url: '/enablebanking/sessions/sess-123',
		});
		assert.equal(response.statusCode, 204);
	});

	it('returns 500 when provider throws', async () => {
		const sessionGateway = makeSessionGateway({
			deleteSession: mock.fn(async () => {
				throw new Error('delete failed');
			}),
		});

		const app = Fastify({ logger: false });
		const { deleteEnableBankingSessionRoute } =
			await import('../../../src/infrastructure/routes/internal/delete-enablebanking-session.js');
		app.register(deleteEnableBankingSessionRoute, {
			sessionGateway,
			sessionRepo: makeSessionRepo(),
		});

		const response = await app.inject({
			method: 'DELETE',
			url: '/enablebanking/sessions/sess-123',
		});
		assert.equal(response.statusCode, 500);
	});
});
