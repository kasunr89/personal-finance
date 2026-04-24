import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankProvider } from '../../../src/ports/bank-provider.js';
import type { Transaction } from '../../../src/domain/types.js';

const mockTx: Transaction = {
	id: 'tx-1',
	accountId: 'acc-1',
	amount: -12.5,
	currency: 'EUR',
	description: 'Coffee',
	bookingDate: '2026-04-22',
	source: 'enablebanking',
	sourceId: 'src-1',
};

describe('GET /enablebanking/accounts/:accountId/transactions', () => {
	it('returns transactions for the given account', async () => {
		const mockProvider: BankProvider = {
			fetchTransactions: mock.fn(async () => [mockTx]),
		};

		const app = Fastify();
		const { enableBankingTransactionsRoute } =
			await import('../../../src/infrastructure/routes/internal/enablebanking-transactions.js');
		app.register(enableBankingTransactionsRoute, {
			provider: mockProvider,
		});

		const response = await app.inject({
			method: 'GET',
			url: '/enablebanking/accounts/acc-1/transactions',
		});
		assert.equal(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.equal(body.length, 1);
		assert.equal(body[0].id, 'tx-1');
		assert.equal(body[0].amount, -12.5);
		assert.equal(body[0].currency, 'EUR');
	});

	it('returns empty array when no transactions', async () => {
		const mockProvider: BankProvider = {
			fetchTransactions: mock.fn(async () => []),
		};

		const app = Fastify();
		const { enableBankingTransactionsRoute } =
			await import('../../../src/infrastructure/routes/internal/enablebanking-transactions.js');
		app.register(enableBankingTransactionsRoute, {
			provider: mockProvider,
		});

		const response = await app.inject({
			method: 'GET',
			url: '/enablebanking/accounts/acc-1/transactions',
		});
		assert.equal(response.statusCode, 200);
		assert.deepEqual(JSON.parse(response.body), []);
	});

	it('returns 500 when provider throws', async () => {
		const mockProvider: BankProvider = {
			fetchTransactions: mock.fn(async () => {
				throw new Error('bank error');
			}),
		};

		const app = Fastify({ logger: false });
		const { enableBankingTransactionsRoute } =
			await import('../../../src/infrastructure/routes/internal/enablebanking-transactions.js');
		app.register(enableBankingTransactionsRoute, {
			provider: mockProvider,
		});

		const response = await app.inject({
			method: 'GET',
			url: '/enablebanking/accounts/acc-1/transactions',
		});
		assert.equal(response.statusCode, 500);
	});
});
