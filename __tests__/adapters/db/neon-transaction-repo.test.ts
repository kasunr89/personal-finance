import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Transaction } from '../../../src/domain/types.js';
import type { Kysely } from 'kysely';
import type { Database } from '../../../src/adapters/db/schema.js';

const tx1: Transaction = {
	referenceId: 'tx-1',
	amount: { value: -15.5, currency: 'EUR' },
	source: 'lhv',
	creditor: { name: '', iban: '' },
	debitor: { name: '', iban: '' },
	type: 'debit',
	status: 'BOOKED',
	date: '2026-04-01',
	description: 'Coffee',
};

const tx2: Transaction = {
	referenceId: 'tx-2',
	amount: { value: -8.0, currency: 'EUR' },
	source: 'lhv',
	creditor: { name: '', iban: '' },
	debitor: { name: '', iban: '' },
	type: 'debit',
	status: 'BOOKED',
	date: '2026-04-02',
	description: 'Bus',
};

function createMockDb(
	insertResult: { id: number } | undefined,
	selectResult: Record<string, unknown>[] = [],
	selectOneResult: Record<string, unknown> | undefined = undefined,
) {
	const executeTakeFirst = mock.fn(async () => insertResult);
	const execute = mock.fn(async () => selectResult);
	const selectOneTakeFirst = mock.fn(async () => selectOneResult);

	const db = {
		insertInto: () => ({
			values: () => ({
				onConflict: () => ({
					returning: () => ({ executeTakeFirst }),
				}),
			}),
		}),
		selectFrom: () => ({
			selectAll: () => ({
				execute,
				where: () => ({ executeTakeFirst: selectOneTakeFirst }),
			}),
		}),
		_executeTakeFirst: executeTakeFirst,
		_execute: execute,
		_selectOneTakeFirst: selectOneTakeFirst,
	} as unknown as Kysely<Database> & {
		_executeTakeFirst: typeof executeTakeFirst;
		_execute: typeof execute;
		_selectOneTakeFirst: typeof selectOneTakeFirst;
	};

	return db;
}

describe('NeonTransactionRepo', () => {
	it('upserts transactions and returns count of inserted rows', async () => {
		const db = createMockDb({ id: 1 });
		const { NeonTransactionRepo } =
			await import('../../../src/adapters/db/neon-transaction-repo.js');
		const repo = new NeonTransactionRepo(db);

		const count = await repo.upsert([tx1, tx2]);

		assert.equal(count, 2);
		assert.equal(db._executeTakeFirst.mock.calls.length, 2);
	});

	it('returns 0 when no transactions provided', async () => {
		const db = createMockDb({ id: 1 });
		const { NeonTransactionRepo } =
			await import('../../../src/adapters/db/neon-transaction-repo.js');
		const repo = new NeonTransactionRepo(db);

		const count = await repo.upsert([]);

		assert.equal(count, 0);
		assert.equal(db._executeTakeFirst.mock.calls.length, 0);
	});

	it('counts only rows returned by RETURNING (skips conflicts)', async () => {
		const db = createMockDb(undefined);
		const { NeonTransactionRepo } =
			await import('../../../src/adapters/db/neon-transaction-repo.js');
		const repo = new NeonTransactionRepo(db);

		const count = await repo.upsert([tx1]);

		assert.equal(count, 0);
	});

	it('returns stored transaction by id', async () => {
		const stored = {
			id: 1,
			amount: '-15.5',
			currency: 'EUR',
			description: 'Coffee',
			source: 'lhv',
			source_reference_id: 'tx-1',
			type: 'debit',
			date: new Date('2026-04-01'),
			created_at: new Date('2026-04-01'),
			creditor: null,
			creditor_iban: null,
			debitor: null,
			debitor_iban: null,
			category: null,
			sub_category: null,
		};
		const db = createMockDb(undefined, [], stored);
		const { NeonTransactionRepo } =
			await import('../../../src/adapters/db/neon-transaction-repo.js');
		const repo = new NeonTransactionRepo(db);

		const result = await repo.getById(1);

		assert.deepEqual(result, stored);
		assert.equal(db._selectOneTakeFirst.mock.calls.length, 1);
	});

	it('returns null when transaction is not found', async () => {
		const db = createMockDb(undefined, [], undefined);
		const { NeonTransactionRepo } =
			await import('../../../src/adapters/db/neon-transaction-repo.js');
		const repo = new NeonTransactionRepo(db);

		const result = await repo.getById(99);

		assert.equal(result, null);
	});

	it('returns rows from getTransactions', async () => {
		const stored = [
			{
				id: 1,
				amount: '-15.5',
				currency: 'EUR',
				description: 'Coffee',
				source: 'lhv',
				source_reference_id: 'tx-1',
				type: 'debit',
				date: new Date('2026-04-01'),
				creditor: null,
				debitor: null,
			},
		];
		const db = createMockDb(undefined, stored);
		const { NeonTransactionRepo } =
			await import('../../../src/adapters/db/neon-transaction-repo.js');
		const repo = new NeonTransactionRepo(db);

		const rows = await repo.getTransactions();

		assert.deepEqual(rows, stored);
		assert.equal(db._execute.mock.calls.length, 1);
	});
});
