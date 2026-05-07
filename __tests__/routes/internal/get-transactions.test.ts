import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { TransactionRepo } from '../../../src/ports/transaction-repo.js';
import type { StoredTransaction } from '../../../src/domain/types.js';

const storedTx: StoredTransaction = {
	id: 1,
	amount: '12.39',
	currency: 'EUR',
	description: 'Bolt',
	source: 'enablebanking',
	source_reference_id: 'src-1',
	type: 'debit',
	date: new Date('2026-04-17T21:00:00.000Z'),
	created_at: new Date('2026-04-17T21:00:00.000Z'),
	creditor: null,
	creditor_iban: null,
	debitor: null,
	debitor_iban: null,
	category: null,
	sub_category: null,
};

describe('GET /transactions', () => {
	it('returns transactions as JSON', async () => {
		const mockRepo: TransactionRepo = {
			upsert: mock.fn(async () => 0),
			getTransactions: mock.fn(async () => [storedTx]),
			getUncategorized: mock.fn(async () => []),
			updateCategories: mock.fn(async () => undefined),
		};

		const app = Fastify();
		const { getTransactionsRoute } =
			await import('../../../src/infrastructure/routes/internal/get-transactions.js');
		app.register(getTransactionsRoute, { repo: mockRepo });

		const response = await app.inject({
			method: 'GET',
			url: '/transactions',
		});
		assert.equal(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.equal(body.length, 1);
		assert.equal(body[0].id, 1);
		assert.equal(body[0].amount, '12.39');
		assert.equal(body[0].source, 'enablebanking');
	});

	it('returns empty array when no transactions', async () => {
		const mockRepo: TransactionRepo = {
			upsert: mock.fn(async () => 0),
			getTransactions: mock.fn(async () => []),
			getUncategorized: mock.fn(async () => []),
			updateCategories: mock.fn(async () => undefined),
		};

		const app = Fastify();
		const { getTransactionsRoute } =
			await import('../../../src/infrastructure/routes/internal/get-transactions.js');
		app.register(getTransactionsRoute, { repo: mockRepo });

		const response = await app.inject({
			method: 'GET',
			url: '/transactions',
		});
		assert.equal(response.statusCode, 200);
		assert.deepEqual(JSON.parse(response.body), []);
	});

	it('returns 500 when DB fails', async () => {
		const mockRepo: TransactionRepo = {
			upsert: mock.fn(async () => 0),
			getTransactions: mock.fn(async () => {
				throw new Error('connection refused');
			}),
			getUncategorized: mock.fn(async () => []),
			updateCategories: mock.fn(async () => undefined),
		};

		const app = Fastify();
		const { getTransactionsRoute } =
			await import('../../../src/infrastructure/routes/internal/get-transactions.js');
		app.register(getTransactionsRoute, { repo: mockRepo });

		const response = await app.inject({
			method: 'GET',
			url: '/transactions',
		});
		assert.equal(response.statusCode, 500);
		assert.deepEqual(JSON.parse(response.body), {
			error: 'Failed to fetch transactions',
		});
	});
});
