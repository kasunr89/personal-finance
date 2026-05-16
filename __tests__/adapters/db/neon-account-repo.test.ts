import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Kysely } from 'kysely';
import type { Database } from '../../../src/adapters/db/schema.js';

function createMockDb(selectResult: Record<string, unknown>[] = []) {
	const execute = mock.fn(async () => selectResult);
	const db = {
		selectFrom: () => ({
			select: () => ({
				where: () => ({ execute }),
			}),
		}),
		_execute: execute,
	} as unknown as Kysely<Database> & { _execute: typeof execute };
	return db;
}

describe('NeonAccountRepo', () => {
	it('returns non-expired accounts from the database', async () => {
		const accounts = [
			{ account_id: 'acc-123', expire_at: new Date('2099-01-01T00:00:00Z') },
		];
		const db = createMockDb(accounts);
		const { NeonAccountRepo } = await import(
			'../../../src/adapters/db/neon-account-repo.js'
		);
		const repo = new NeonAccountRepo(db);

		const result = await repo.getAll();

		assert.deepEqual(result, accounts);
		assert.equal(db._execute.mock.calls.length, 1);
	});

	it('returns empty array when no active accounts exist', async () => {
		const db = createMockDb([]);
		const { NeonAccountRepo } = await import(
			'../../../src/adapters/db/neon-account-repo.js'
		);
		const repo = new NeonAccountRepo(db);

		const result = await repo.getAll();

		assert.deepEqual(result, []);
		assert.equal(db._execute.mock.calls.length, 1);
	});
});
