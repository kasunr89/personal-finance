import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankProvider } from '../../../src/ports/bank-provider.js';
import type { TransactionRepo } from '../../../src/ports/transaction-repo.js';

process.env.SYNC_SECRET = 'test-secret';

const AUTH = 'Bearer test-secret';

const mockProvider: BankProvider = {
	fetchTransactions: mock.fn(async () => []),
};

const mockRepo: TransactionRepo = {
	upsert: mock.fn(async () => 3),
	getTransactions: mock.fn(async () => []),
};

async function buildApp() {
	const app = Fastify({ logger: false });
	const { postSyncEnableBankingRoute } =
		await import('../../../src/infrastructure/routes/internal/post-sync-enablebanking.js');
	app.register(postSyncEnableBankingRoute, {
		provider: mockProvider,
		repo: mockRepo,
	});
	return app;
}

describe('POST /sync-enablebanking', () => {
	it('returns 401 when Authorization header is missing', async () => {
		const app = await buildApp();
		const response = await app.inject({
			method: 'POST',
			url: '/sync-enablebanking',
		});
		assert.equal(response.statusCode, 401);
		assert.deepEqual(JSON.parse(response.body), { error: 'Unauthorized' });
	});

	it('returns 401 when Authorization header is wrong', async () => {
		const app = await buildApp();
		const response = await app.inject({
			method: 'POST',
			url: '/sync-enablebanking',
			headers: { authorization: 'Bearer wrong-secret' },
		});
		assert.equal(response.statusCode, 401);
		assert.deepEqual(JSON.parse(response.body), { error: 'Unauthorized' });
	});

	it('returns sync result when authorized', async () => {
		const app = await buildApp();
		const response = await app.inject({
			method: 'POST',
			url: '/sync-enablebanking',
			headers: { authorization: AUTH },
		});
		assert.equal(response.statusCode, 200);
		assert.deepEqual(JSON.parse(response.body), { synced: 3 });
	});

	it('returns 400 when accountUid or dateFrom missing and no injected provider', async () => {
		const app = Fastify({ logger: false });
		const { postSyncEnableBankingRoute } =
			await import('../../../src/infrastructure/routes/internal/post-sync-enablebanking.js');
		app.register(postSyncEnableBankingRoute, { repo: mockRepo });

		const response = await app.inject({
			method: 'POST',
			url: '/sync-enablebanking',
			headers: { authorization: AUTH },
		});
		assert.equal(response.statusCode, 400);
		assert.deepEqual(JSON.parse(response.body), {
			error: 'accountUid and dateFrom query params required',
		});
	});

	it('returns 503 on Enable Banking API error', async () => {
		const failingProvider: BankProvider = {
			fetchTransactions: mock.fn(async () => {
				throw new Error('Enable Banking API error: 503');
			}),
		};

		const app = Fastify({ logger: false });
		const { postSyncEnableBankingRoute } =
			await import('../../../src/infrastructure/routes/internal/post-sync-enablebanking.js');
		app.register(postSyncEnableBankingRoute, {
			provider: failingProvider,
			repo: mockRepo,
		});

		const response = await app.inject({
			method: 'POST',
			url: '/sync-enablebanking',
			headers: { authorization: AUTH },
		});
		assert.equal(response.statusCode, 503);
		assert.deepEqual(JSON.parse(response.body), {
			error: 'Enable Banking API unavailable',
		});
	});

	it('returns 500 on unexpected error', async () => {
		const failingProvider: BankProvider = {
			fetchTransactions: mock.fn(async () => {
				throw new Error('Unexpected failure');
			}),
		};

		const app = Fastify({ logger: false });
		const { postSyncEnableBankingRoute } =
			await import('../../../src/infrastructure/routes/internal/post-sync-enablebanking.js');
		app.register(postSyncEnableBankingRoute, {
			provider: failingProvider,
			repo: mockRepo,
		});

		const response = await app.inject({
			method: 'POST',
			url: '/sync-enablebanking',
			headers: { authorization: AUTH },
		});
		assert.equal(response.statusCode, 500);
		assert.deepEqual(JSON.parse(response.body), { error: 'Sync error' });
	});
});
