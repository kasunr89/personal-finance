import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockFetch = mock.fn();
(global as any).fetch = mockFetch;

describe('LhvProvider', () => {
	beforeEach(() => {
		mockFetch.mock.resetCalls();
		process.env.LHV_CLIENT_ID = 'test-client-id';
		process.env.LHV_API_KEY = 'test-api-key';
	});

	it('fetches and maps transactions to domain type', async () => {
		const lhvResponse = [
			{
				id: 'tx-1',
				bookingDate: '2026-04-01',
				amount: -15.5,
				currency: 'EUR',
				description: 'Coffee',
				accountId: 'EE123456789',
			},
		];

		(mockFetch as any).mock.mockImplementationOnce(async () => ({
			ok: true,
			json: async () => ({ transactions: lhvResponse }),
		}));

		const { LhvProvider } =
			await import('../../../src/adapters/banks/lhv/lhv-provider.js');
		const provider = new LhvProvider();
		const result = await provider.fetchTransactions();

		assert.equal(result.length, 1);
		assert.equal(result[0].source, 'lhv');
		assert.equal(result[0].sourceId, 'tx-1');
		assert.equal(result[0].id, '');
		assert.equal(result[0].amount, -15.5);
		assert.equal(result[0].bookingDate, '2026-04-01');

		const calledUrl: string = mockFetch.mock.calls[0].arguments[0];
		assert.match(
			calledUrl,
			/dateFrom=\d{4}-\d{2}-\d{2}&dateTo=\d{4}-\d{2}-\d{2}/,
		);
	});

	it('throws when API returns non-2xx', async () => {
		(mockFetch as any).mock.mockImplementationOnce(async () => ({
			ok: false,
			status: 401,
		}));

		const { LhvProvider } =
			await import('../../../src/adapters/banks/lhv/lhv-provider.js');
		const provider = new LhvProvider();

		await assert.rejects(() => provider.fetchTransactions(), {
			message: 'LHV API error: 401',
		});
	});

	it('throws when env vars are missing', async () => {
		delete process.env.LHV_CLIENT_ID;
		delete process.env.LHV_API_KEY;

		const { LhvProvider } =
			await import('../../../src/adapters/banks/lhv/lhv-provider.js');
		const provider = new LhvProvider();

		await assert.rejects(() => provider.fetchTransactions(), {
			message:
				'LHV_CLIENT_ID and LHV_API_KEY environment variables are required',
		});
	});
});
