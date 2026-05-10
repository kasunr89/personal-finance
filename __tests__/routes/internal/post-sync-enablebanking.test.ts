import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankGateway } from '../../../src/ports/bank-gateway.js';
import type { TransactionRepo } from '../../../src/ports/transaction-repo.js';
import type { TransactionCategoryGateway } from '../../../src/ports/transaction-category-gateway.js';

process.env.SYNC_SECRET = 'test-secret';

const AUTH = 'Bearer test-secret';
const BODY = { account_id: 'EE123', date_from: '2026-04-01' };

const mockBankGateway: BankGateway = {
	getTransactions: mock.fn(async () => []),
};

const mockRepo: TransactionRepo = {
	upsert: mock.fn(async () => 3),
	getTransactions: mock.fn(async () => []),
	getUncategorized: mock.fn(async () => []),
	updateCategories: mock.fn(async () => undefined),
	getById: mock.fn(async () => null),
};

const mockTransactionCategoryGateway: TransactionCategoryGateway = {
	categorize: mock.fn(async () => []),
};

async function buildApp() {
	const app = Fastify({ logger: false });
	const { postSyncEnableBankingRoute } =
		await import('../../../src/infrastructure/routes/internal/post-sync-enablebanking.js');
	app.register(postSyncEnableBankingRoute, {
		bankGateway: mockBankGateway,
		repo: mockRepo,
		categoryClient: mockTransactionCategoryGateway,
	});
	return app;
}

describe('POST /sync-enablebanking', () => {
	it('returns 401 when Authorization header is missing', async () => {
		const app = await buildApp();
		const response = await app.inject({
			method: 'POST',
			url: '/sync-enablebanking',
			payload: BODY,
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
			payload: BODY,
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
			payload: BODY,
		});
		assert.equal(response.statusCode, 200);
		assert.deepEqual(JSON.parse(response.body), { synced: 3 });
	});

	it('returns 400 when body is missing', async () => {
		const app = await buildApp();
		const response = await app.inject({
			method: 'POST',
			url: '/sync-enablebanking',
			headers: { authorization: AUTH },
		});
		assert.equal(response.statusCode, 400);
	});

	it('returns 503 on Enable Banking API error', async () => {
		const failingBankGateway: BankGateway = {
			getTransactions: mock.fn(async () => {
				throw new Error('Enable Banking API error: 503');
			}),
		};

		const app = Fastify({ logger: false });
		const { postSyncEnableBankingRoute } =
			await import('../../../src/infrastructure/routes/internal/post-sync-enablebanking.js');
		app.register(postSyncEnableBankingRoute, {
			bankGateway: failingBankGateway,
			repo: mockRepo,
			categoryClient: mockTransactionCategoryGateway,
		});

		const response = await app.inject({
			method: 'POST',
			url: '/sync-enablebanking',
			headers: { authorization: AUTH },
			payload: BODY,
		});
		assert.equal(response.statusCode, 503);
		assert.deepEqual(JSON.parse(response.body), {
			error: 'Enable Banking API unavailable',
		});
	});

	it('returns 500 on unexpected error', async () => {
		const failingBankGateway: BankGateway = {
			getTransactions: mock.fn(async () => {
				throw new Error('Unexpected failure');
			}),
		};

		const app = Fastify({ logger: false });
		const { postSyncEnableBankingRoute } =
			await import('../../../src/infrastructure/routes/internal/post-sync-enablebanking.js');
		app.register(postSyncEnableBankingRoute, {
			bankGateway: failingBankGateway,
			repo: mockRepo,
			categoryClient: mockTransactionCategoryGateway,
		});

		const response = await app.inject({
			method: 'POST',
			url: '/sync-enablebanking',
			headers: { authorization: AUTH },
			payload: BODY,
		});
		assert.equal(response.statusCode, 500);
		assert.deepEqual(JSON.parse(response.body), { error: 'Sync error' });
	});
});
