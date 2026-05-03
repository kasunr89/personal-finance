import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankSession } from '../../../src/domain/types.js';
import type { EnableBankingSessionGateway } from '../../../src/ports/enablebanking-session-gateway.js';

const mockSession: BankSession = {
	status: 'AUTHORIZED',
	accounts: ['acc-1'],
	accountsData: [{ uid: 'acc-1', identificationHash: 'hash1' }],
	validUntil: '2026-07-01',
};

function makeSessionGateway(
	overrides?: Partial<EnableBankingSessionGateway>,
): EnableBankingSessionGateway {
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
		const sessionGateway = makeSessionGateway();

		const app = Fastify();
		const { getEnableBankingSessionRoute } =
			await import('../../../src/infrastructure/routes/internal/get-enablebanking-session.js');
		app.register(getEnableBankingSessionRoute, { sessionGateway });

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
		const sessionGateway = makeSessionGateway({
			getSession: mock.fn(async () => {
				throw new Error('upstream error');
			}),
		});

		const app = Fastify({ logger: false });
		const { getEnableBankingSessionRoute } =
			await import('../../../src/infrastructure/routes/internal/get-enablebanking-session.js');
		app.register(getEnableBankingSessionRoute, { sessionGateway });

		const response = await app.inject({
			method: 'GET',
			url: '/enablebanking/sessions/sess-123',
		});
		assert.equal(response.statusCode, 500);
	});
});
