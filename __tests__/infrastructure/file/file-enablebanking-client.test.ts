import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FileEnableBankingClient } from '../../../src/infrastructure/file/file-enablebanking-client.js';

describe('FileEnableBankingClient', () => {
	it('uses the passed source for returned transactions', async () => {
		const client = new FileEnableBankingClient('data/transactions-2026-04-01.json');
		const txs = await client.getAllTransactions('uid', '2026-01-01', 'wise');
		assert.ok(txs.length > 0, 'expected at least one transaction');
		assert.ok(txs.every((t) => t.source === 'wise'), 'all transactions should have source wise');
	});

	it('uses lhv source when passed lhv', async () => {
		const client = new FileEnableBankingClient('data/transactions-2026-04-01.json');
		const txs = await client.getAllTransactions('uid', '2026-01-01', 'lhv');
		assert.ok(txs.every((t) => t.source === 'lhv'), 'all transactions should have source lhv');
	});
});
