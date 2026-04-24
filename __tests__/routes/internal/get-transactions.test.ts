import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { TransactionRepo } from '../../../src/ports/transaction-repo.js';
import type { StoredTransaction } from '../../../src/domain/types.js';

const storedTx: StoredTransaction = {
	id: 1,
	account_id: '19032424',
	amount: '12.39',
	currency: 'EUR',
	description: 'Bolt',
	source: 'enablebanking',
	source_id: 'src-1',
	created_at: new Date('2026-04-17T21:00:00.000Z'),
};

describe('GET /transactions', () => {
	it('returns transactions as JSON', async () => {
		const mockRepo: TransactionRepo = {
			upsert: mock.fn(async () => 0),
			getTransactions: mock.fn(async () => [storedTx]),
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
