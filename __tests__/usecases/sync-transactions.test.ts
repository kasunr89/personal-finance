import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { syncTransactions } from '../../src/usecases/sync-transactions.js';
import type { BankProvider } from '../../src/ports/bank-provider.js';
import type { TransactionRepo } from '../../src/ports/transaction-repo.js';
import type { Transaction } from '../../src/domain/types.js';

const tx: Transaction = {
	id: 'tx-1',
	accountId: 'EE123',
	amount: -15.5,
	currency: 'EUR',
	description: 'Coffee',
	bookingDate: '2026-04-01',
	source: 'lhv',
	sourceId: 'tx-1',
};

describe('syncTransactions', () => {
	it('fetches transactions and upserts them', async () => {
		const provider: BankProvider = {
			fetchTransactions: mock.fn(async () => [tx]),
		};
		const repo: TransactionRepo = {
			upsert: mock.fn(async () => 1),
		};

		const result = await syncTransactions(provider, repo);

		assert.equal(result.synced, 1);
		assert.equal((repo.upsert as any).mock.calls.length, 1);
		assert.deepEqual((repo.upsert as any).mock.calls[0].arguments[0], [tx]);
	});

	it('returns zero when provider returns no transactions', async () => {
		const provider: BankProvider = {
			fetchTransactions: mock.fn(async () => []),
		};
		const repo: TransactionRepo = {
			upsert: mock.fn(async () => 0),
		};

		const result = await syncTransactions(provider, repo);

		assert.equal(result.synced, 0);
		assert.equal((repo.upsert as any).mock.calls.length, 1);
		assert.deepEqual((repo.upsert as any).mock.calls[0].arguments[0], []);
	});

	it('propagates provider errors', async () => {
		const provider: BankProvider = {
			fetchTransactions: mock.fn(async () => {
				throw new Error('API down');
			}),
		};
		const repo: TransactionRepo = {
			upsert: mock.fn(async () => 0),
		};

		await assert.rejects(() => syncTransactions(provider, repo), {
			message: 'API down',
		});
	});

	it('propagates repo errors', async () => {
		const provider: BankProvider = {
			fetchTransactions: mock.fn(async () => [tx]),
		};
		const repo: TransactionRepo = {
			upsert: mock.fn(async () => {
				throw new Error('DB down');
			}),
		};

		await assert.rejects(() => syncTransactions(provider, repo), {
			message: 'DB down',
		});
	});
});
