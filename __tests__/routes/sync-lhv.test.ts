import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankProvider } from '../../src/ports/bank-provider.js';
import type { TransactionRepo } from '../../src/ports/transaction-repo.js';
import type { Transaction } from '../../src/domain/types.js';

const tx: Transaction = {
	id: '',
	accountId: 'EE123',
	amount: -15.5,
	currency: 'EUR',
	description: 'Coffee',
	bookingDate: '2026-04-01',
	source: 'lhv',
	sourceId: 'tx-1',
};

const tx2: Transaction = {
	id: '',
	accountId: 'EE123',
	amount: -8.0,
	currency: 'EUR',
	description: 'Bus',
	bookingDate: '2026-04-02',
	source: 'lhv',
	sourceId: 'tx-2',
};

describe('GET /sync-lhv', () => {
	it('returns synced count on success', async () => {
		const mockProvider: BankProvider = {
			fetchTransactions: mock.fn(async () => [tx, tx2]),
		};
		const mockRepo: TransactionRepo = {
			upsert: mock.fn(async () => 2),
			getTransactions: mock.fn(async () => []),
		};

		const app = Fastify();
		const { syncLhvRoute } =
			await import('../../src/infrastructure/routes/sync-lhv.js');
		app.register(syncLhvRoute, {
			provider: mockProvider,
			repo: mockRepo,
		});

		const response = await app.inject({ method: 'GET', url: '/sync-lhv' });
		assert.equal(response.statusCode, 200);
		assert.deepEqual(JSON.parse(response.body), { synced: 2 });
	});

	it('returns 503 when bank API fails', async () => {
		const mockProvider: BankProvider = {
			fetchTransactions: mock.fn(async () => {
				throw new Error('LHV API error: 401');
			}),
		};
		const mockRepo: TransactionRepo = {
			upsert: mock.fn(async () => 0),
			getTransactions: mock.fn(async () => []),
		};

		const app = Fastify();
		const { syncLhvRoute } =
			await import('../../src/infrastructure/routes/sync-lhv.js');
		app.register(syncLhvRoute, {
			provider: mockProvider,
			repo: mockRepo,
		});

		const response = await app.inject({ method: 'GET', url: '/sync-lhv' });
		assert.equal(response.statusCode, 503);
		assert.deepEqual(JSON.parse(response.body), {
			error: 'LHV API unavailable',
		});
	});

	it('returns 500 when DB fails', async () => {
		const mockProvider: BankProvider = {
			fetchTransactions: mock.fn(async () => [tx]),
		};
		const mockRepo: TransactionRepo = {
			upsert: mock.fn(async () => {
				throw new Error('connection refused');
			}),
			getTransactions: mock.fn(async () => []),
		};

		const app = Fastify();
		const { syncLhvRoute } =
			await import('../../src/infrastructure/routes/sync-lhv.js');
		app.register(syncLhvRoute, {
			provider: mockProvider,
			repo: mockRepo,
		});

		const response = await app.inject({ method: 'GET', url: '/sync-lhv' });
		assert.equal(response.statusCode, 500);
		assert.deepEqual(JSON.parse(response.body), {
			error: 'Sync error',
		});
	});
});
