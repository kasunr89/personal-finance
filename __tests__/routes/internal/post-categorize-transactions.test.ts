import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { TransactionRepo } from '../../../src/ports/transaction-repo.js';
import type { TransactionCategoryGateway } from '../../../src/ports/transaction-category-gateway.js';

process.env.SYNC_SECRET = 'test-secret';

const AUTH = 'Bearer test-secret';

const mockRepo: TransactionRepo = {
	upsert: mock.fn(async () => 0),
	getTransactions: mock.fn(async () => []),
	getUncategorized: mock.fn(async () => [
		{
			id: 1,
			description: 'BOLT.EU',
			type: 'credit',
			creditor: 'Bolt Technology OÜ',
			creditor_iban: null,
			debitor: 'Kasun Ramadasa',
			debitor_iban: 'EE123456789012345678',
		},
	]),
	updateCategories: mock.fn(async () => undefined),
	getById: mock.fn(async () => null),
};

const mockTransactionCategoryGateway: TransactionCategoryGateway = {
	categorize: mock.fn(async () => [
		{ id: 1, category: 'Transport', sub_category: 'Ride-hailing' },
	]),
};

async function buildApp() {
	const app = Fastify({ logger: false });
	const { postCategorizeTransactionsRoute } =
		await import('../../../src/infrastructure/routes/internal/post-categorize-transactions.js');
	app.register(postCategorizeTransactionsRoute, {
		repo: mockRepo,
		categoryClient: mockTransactionCategoryGateway,
	});
	return app;
}

describe('POST /categorize-transactions', () => {
	it('returns 401 when Authorization header is missing', async () => {
		const app = await buildApp();
		const response = await app.inject({
			method: 'POST',
			url: '/categorize-transactions',
		});
		assert.equal(response.statusCode, 401);
		assert.deepEqual(JSON.parse(response.body), { error: 'Unauthorized' });
	});

	it('returns 401 when Authorization header is wrong', async () => {
		const app = await buildApp();
		const response = await app.inject({
			method: 'POST',
			url: '/categorize-transactions',
			headers: { authorization: 'Bearer wrong-secret' },
		});
		assert.equal(response.statusCode, 401);
		assert.deepEqual(JSON.parse(response.body), { error: 'Unauthorized' });
	});

	it('returns categorized count when authorized', async () => {
		const app = await buildApp();
		const response = await app.inject({
			method: 'POST',
			url: '/categorize-transactions',
			headers: { authorization: AUTH },
		});
		assert.equal(response.statusCode, 200);
		assert.deepEqual(JSON.parse(response.body), { categorized: 1 });
	});

	it('returns 500 on unexpected error', async () => {
		const failingRepo: TransactionRepo = {
			upsert: mock.fn(async () => 0),
			getTransactions: mock.fn(async () => []),
			getUncategorized: mock.fn(async () => {
				throw new Error('DB down');
			}),
			updateCategories: mock.fn(async () => undefined),
			getById: mock.fn(async () => null),
		};

		const app = Fastify({ logger: false });
		const { postCategorizeTransactionsRoute } =
			await import('../../../src/infrastructure/routes/internal/post-categorize-transactions.js');
		app.register(postCategorizeTransactionsRoute, {
			repo: failingRepo,
			categoryClient: mockTransactionCategoryGateway,
		});

		const response = await app.inject({
			method: 'POST',
			url: '/categorize-transactions',
			headers: { authorization: AUTH },
		});
		assert.equal(response.statusCode, 500);
		assert.deepEqual(JSON.parse(response.body), { error: 'Categorization error' });
	});
});
