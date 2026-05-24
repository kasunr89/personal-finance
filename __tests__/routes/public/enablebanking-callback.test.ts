import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankSession } from '../../../src/domain/types.js';
import type { EnableBankingSessionGateway } from '../../../src/ports/enablebanking-session-gateway.js';
import type { SessionRepo } from '../../../src/ports/session-repo.js';

const mockSession: BankSession = {
	id: 'sess-123',
	status: 'AUTHORIZED',
	accounts: ['acc-1'],
	bankConnector: { name: 'LHV Pank', country: 'EE' },
	expireAt: '2026-07-01',
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

function makeSessionRepo(overrides?: Partial<SessionRepo>): SessionRepo {
	return {
		getAll: mock.fn(async () => []),
		getByBankKey: mock.fn(async () => []),
		upsert: mock.fn(async () => {}),
		deleteByBankKey: mock.fn(async () => {}),
		...overrides,
	};
}

describe('GET /callback', () => {
	it('returns 400 when code is missing', async () => {
		const app = Fastify();
		const { getEnableBankingCallbackRoute } =
			await import('../../../src/infrastructure/routes/public/get-enablebanking-callback.js');
		app.register(getEnableBankingCallbackRoute, {
			sessionGateway: makeSessionGateway(),
			sessionRepo: makeSessionRepo(),
		});

		const response = await app.inject({ method: 'GET', url: '/callback' });
		assert.equal(response.statusCode, 400);
		assert.deepEqual(JSON.parse(response.body), {
			error: 'Missing code parameter',
		});
	});

	it('returns accounts when code is valid', async () => {
		const sessionGateway = makeSessionGateway();

		const app = Fastify();
		const { getEnableBankingCallbackRoute } =
			await import('../../../src/infrastructure/routes/public/get-enablebanking-callback.js');
		app.register(getEnableBankingCallbackRoute, { sessionGateway, sessionRepo: makeSessionRepo() });

		const response = await app.inject({
			method: 'GET',
			url: '/callback?code=auth-code-123',
		});
		assert.equal(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.deepEqual(body.accounts, ['acc-1']);
		assert.equal(body.bankConnector.name, 'LHV Pank');
		assert.equal(body.bankConnector.country, 'EE');
	});

	it('returns 500 when createSession throws', async () => {
		const sessionGateway = makeSessionGateway({
			createSession: mock.fn(async () => {
				throw new Error('session error');
			}),
		});

		const app = Fastify({ logger: false });
		const { getEnableBankingCallbackRoute } =
			await import('../../../src/infrastructure/routes/public/get-enablebanking-callback.js');
		app.register(getEnableBankingCallbackRoute, { sessionGateway, sessionRepo: makeSessionRepo() });

		const response = await app.inject({
			method: 'GET',
			url: '/callback?code=bad-code',
		});
		assert.equal(response.statusCode, 500);
	});
});
