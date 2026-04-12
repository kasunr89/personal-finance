import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Transaction } from '../../../src/domain/types.js';

const mockSqlFn = mock.fn(async () => [{ id: 1 }]);

describe('NeonTransactionRepo', () => {
	beforeEach(() => {
		mockSqlFn.mock.resetCalls();
	});

	it('upserts transactions and returns count of inserted rows', async () => {
		const { NeonTransactionRepo } =
			await import('../../../src/adapters/db/neon-transaction-repo.js');
		const repo = new NeonTransactionRepo(mockSqlFn as any);

		const txs: Transaction[] = [
			{
				id: 'tx-1',
				accountId: 'EE123',
				amount: -15.5,
				currency: 'EUR',
				description: 'Coffee',
				bookingDate: '2026-04-01',
				source: 'lhv',
				sourceId: 'lhv-tx-1',
			},
			{
				id: 'tx-2',
				accountId: 'EE123',
				amount: -8.0,
				currency: 'EUR',
				description: 'Bus',
				bookingDate: '2026-04-02',
				source: 'lhv',
				sourceId: 'lhv-tx-2',
			},
		];

		const count = await repo.upsert(txs);

		assert.equal(count, 2);
		assert.equal(mockSqlFn.mock.calls.length, 2);
	});

	it('returns 0 when no transactions provided', async () => {
		const { NeonTransactionRepo } =
			await import('../../../src/adapters/db/neon-transaction-repo.js');
		const repo = new NeonTransactionRepo(mockSqlFn as any);

		const count = await repo.upsert([]);

		assert.equal(count, 0);
		assert.equal(mockSqlFn.mock.calls.length, 0);
	});

	it('counts only rows with RETURNING results', async () => {
		const sqlReturnsEmpty = mock.fn(async () => []);
		const { NeonTransactionRepo } =
			await import('../../../src/adapters/db/neon-transaction-repo.js');
		const repo = new NeonTransactionRepo(sqlReturnsEmpty as any);

		const txs: Transaction[] = [
			{
				id: 'tx-1',
				accountId: 'EE123',
				amount: -15.5,
				currency: 'EUR',
				description: 'Coffee',
				bookingDate: '2026-04-01',
				source: 'lhv',
				sourceId: 'lhv-tx-1',
			},
		];

		const count = await repo.upsert(txs);

		assert.equal(count, 0);
	});
});
