import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankSession } from '../../../src/domain/types.js';
import type { EnableBankingSessionGateway } from '../../../src/ports/enablebanking-session-gateway.js';
import type { EnablebankingSession, SessionRepo } from '../../../src/ports/session-repo.js';

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

function makeSessionRepo(overrides?: Partial<SessionRepo>): SessionRepo {
	return {
		getAll: mock.fn(async () => [] as EnablebankingSession[]),
		getByConnector: mock.fn(async () => [] as EnablebankingSession[]),
		upsert: mock.fn(async () => {}),
		deleteByConnector: mock.fn(async () => {}),
		...overrides,
	};
}

describe('GET /:bank/start', () => {
	it('returns the bank authorization URL', async () => {
		const sessionGateway = makeSessionGateway();
		const sessionRepo = makeSessionRepo();

		const app = Fastify();
		const { getEnableBankingStartRoute } =
			await import('../../../src/infrastructure/routes/auth/get-enablebanking-start.js');
		app.register(getEnableBankingStartRoute, { sessionGateway, sessionRepo });

		const response = await app.inject({ method: 'GET', url: '/lhv/start' });
		assert.equal(response.statusCode, 200);
		assert.deepEqual(JSON.parse(response.body), { url: 'https://bank.example/auth' });
	});

	it('returns 400 for an unknown bank', async () => {
		const app = Fastify({ logger: false });
		const { getEnableBankingStartRoute } =
			await import('../../../src/infrastructure/routes/auth/get-enablebanking-start.js');
		app.register(getEnableBankingStartRoute, { sessionGateway: makeSessionGateway() });

		const response = await app.inject({ method: 'GET', url: '/unknown-bank/start' });
		assert.equal(response.statusCode, 400);
	});

	it('returns 409 when an active session for that bank already exists', async () => {
		const sessionRepo = makeSessionRepo({
			getAll: mock.fn(async () => [
				{
					id: 'session-1',
					expire_at: new Date(Date.now() + 60 * 60 * 1000),
					connector: 'lhv' as const,
					accounts: ['acc-1'],
				},
			]),
		});

		const app = Fastify({ logger: false });
		const { getEnableBankingStartRoute } =
			await import('../../../src/infrastructure/routes/auth/get-enablebanking-start.js');
		app.register(getEnableBankingStartRoute, { sessionGateway: makeSessionGateway(), sessionRepo });

		const response = await app.inject({ method: 'GET', url: '/lhv/start' });
		assert.equal(response.statusCode, 409);
	});

	it('does not return 409 when active session belongs to a different bank', async () => {
		const sessionRepo = makeSessionRepo({
			getAll: mock.fn(async () => [
				{
					id: 'session-1',
					expire_at: new Date(Date.now() + 60 * 60 * 1000),
					connector: 'wise' as const,
					accounts: ['acc-1'],
				},
			]),
		});

		const app = Fastify({ logger: false });
		const { getEnableBankingStartRoute } =
			await import('../../../src/infrastructure/routes/auth/get-enablebanking-start.js');
		app.register(getEnableBankingStartRoute, { sessionGateway: makeSessionGateway(), sessionRepo });

		const response = await app.inject({ method: 'GET', url: '/lhv/start' });
		assert.equal(response.statusCode, 200);
	});

	it('returns 500 when provider throws', async () => {
		const sessionGateway = makeSessionGateway({
			startAuth: mock.fn(async () => { throw new Error('auth failed'); }),
		});

		const app = Fastify({ logger: false });
		const { getEnableBankingStartRoute } =
			await import('../../../src/infrastructure/routes/auth/get-enablebanking-start.js');
		app.register(getEnableBankingStartRoute, { sessionGateway });

		const response = await app.inject({ method: 'GET', url: '/lhv/start' });
		assert.equal(response.statusCode, 500);
	});
});
