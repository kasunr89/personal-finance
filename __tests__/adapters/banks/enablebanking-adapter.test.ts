import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EnableBankingAdapter } from '../../../src/adapters/banks/enablebanking/enablebanking-adapter.js';
import type { EnableBankingTransactionGateway } from '../../../src/ports/enablebanking-transaction-gateway.js';
import type { Transaction } from '../../../src/domain/types.js';

const baseTx: Transaction = {
	referenceId: 'tx-1',
	amount: { value: 100, currency: 'EUR' },
	source: 'lhv',
	creditor: { name: null, iban: null },
	debitor: { name: null, iban: null },
	type: 'debit',
	status: 'BOOKED',
	date: '2026-01-01',
	description: 'Test',
};

describe('EnableBankingAdapter', () => {
	it('passes wise source to getAllTransactions', async () => {
		let capturedSource: Transaction['source'] | undefined;
		const client: EnableBankingTransactionGateway = {
			getAllTransactions: mock.fn(async (_uid, _from, source) => {
				capturedSource = source;
				return [{ ...baseTx, source: 'wise' }];
			}),
		};

		await new EnableBankingAdapter(client, 'uid-wise', '2026-01-01', 'wise').getTransactions();

		assert.equal(capturedSource, 'wise');
	});

	it('passes lhv source to getAllTransactions', async () => {
		let capturedSource: Transaction['source'] | undefined;
		const client: EnableBankingTransactionGateway = {
			getAllTransactions: mock.fn(async (_uid, _from, source) => {
				capturedSource = source;
				return [{ ...baseTx, source: 'lhv' }];
			}),
		};

		await new EnableBankingAdapter(client, 'uid-lhv', '2026-01-01', 'lhv').getTransactions();

		assert.equal(capturedSource, 'lhv');
	});
});
