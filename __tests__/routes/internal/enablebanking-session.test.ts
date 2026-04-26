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
		assert.equal(body.validUntil, '2026-07-01');
		assert.equal(body.accountsData[0].uid, 'acc-1');
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
