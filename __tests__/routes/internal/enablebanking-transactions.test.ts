import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankGateway } from '../../../src/ports/bank-gateway.js';
import type { Transaction } from '../../../src/domain/types.js';

const mockTx: Transaction = {
	referenceId: 'tx-1',
	amount: { value: -12.5, currency: 'EUR' },
	source: 'lhv',
	creditor: { name: '', iban: '' },
	debitor: { name: '', iban: '' },
	type: 'debit',
	status: 'BOOKED',
	date: '2026-04-22',
	description: 'Coffee',
};

describe('GET /enablebanking/accounts/:accountId/transactions', () => {
	it('returns transactions for the given account', async () => {
		const mockBankGateway: BankGateway = {
			getTransactions: mock.fn(async () => [mockTx]),
		};

		const app = Fastify();
		const { getEnableBankingTransactionsRoute } =
			await import('../../../src/infrastructure/routes/internal/get-enablebanking-transactions.js');
		app.register(getEnableBankingTransactionsRoute, {
			bankGateway: mockBankGateway,
		});

		const response = await app.inject({
			method: 'GET',
			url: '/enablebanking/accounts/acc-1/transactions?source=lhv',
		});
		assert.equal(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.equal(body.length, 1);
		assert.equal(body[0].referenceId, 'tx-1');
		assert.equal(body[0].amount.value, -12.5);
		assert.equal(body[0].amount.currency, 'EUR');
	});

	it('returns empty array when no transactions', async () => {
		const mockBankGateway: BankGateway = {
			getTransactions: mock.fn(async () => []),
		};

		const app = Fastify();
		const { getEnableBankingTransactionsRoute } =
			await import('../../../src/infrastructure/routes/internal/get-enablebanking-transactions.js');
		app.register(getEnableBankingTransactionsRoute, {
			bankGateway: mockBankGateway,
		});

		const response = await app.inject({
			method: 'GET',
			url: '/enablebanking/accounts/acc-1/transactions?source=lhv',
		});
		assert.equal(response.statusCode, 200);
		assert.deepEqual(JSON.parse(response.body), []);
	});

	it('returns 500 when provider throws', async () => {
		const mockBankGateway: BankGateway = {
			getTransactions: mock.fn(async () => {
				throw new Error('bank error');
			}),
		};

		const app = Fastify({ logger: false });
		const { getEnableBankingTransactionsRoute } =
			await import('../../../src/infrastructure/routes/internal/get-enablebanking-transactions.js');
		app.register(getEnableBankingTransactionsRoute, {
			bankGateway: mockBankGateway,
		});

		const response = await app.inject({
			method: 'GET',
			url: '/enablebanking/accounts/acc-1/transactions?source=lhv',
		});
		assert.equal(response.statusCode, 500);
	});
});
