import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';

const mockFetchLhvTransactions = mock.fn();
// Default implementation returns a single-row result so synced counts work
const mockSql = mock.fn(async () => [{ id: 0 }]);

describe('GET /sync-lhv', () => {
	beforeEach(() => {
		mockFetchLhvTransactions.mock.resetCalls();
		mockSql.mock.resetCalls();
	});

	it('returns synced count on success', async () => {
		mockFetchLhvTransactions.mock.mockImplementationOnce(async () => [
			{
				id: 'tx-1',
				bookingDate: '2026-04-01',
				amount: -15.5,
				currency: 'EUR',
				description: 'Coffee',
				accountId: 'EE123',
			},
			{
				id: 'tx-2',
				bookingDate: '2026-04-02',
				amount: -8.0,
				currency: 'EUR',
				description: 'Bus',
				accountId: 'EE123',
			},
		]);
		// mockSql default returns [{id: 0}] so each insert returns 1 row — both transactions count

		const app = Fastify();
		const { syncLhvRoute } = await import('../routes/sync-lhv.js');
		app.register(syncLhvRoute, {
			fetchTransactions: mockFetchLhvTransactions as any,
			sql: mockSql as any,
		});

		const response = await app.inject({ method: 'GET', url: '/sync-lhv' });
		assert.equal(response.statusCode, 200);
		assert.deepEqual(JSON.parse(response.body), { synced: 2 });
	});

	it('returns 503 when LHV API fails', async () => {
		mockFetchLhvTransactions.mock.mockImplementationOnce(async () => {
			throw new Error('LHV API error: 401');
		});

		const app = Fastify();
		const { syncLhvRoute } = await import('../routes/sync-lhv.js');
		app.register(syncLhvRoute, {
			fetchTransactions: mockFetchLhvTransactions as any,
			sql: mockSql as any,
		});

		const response = await app.inject({ method: 'GET', url: '/sync-lhv' });
		assert.equal(response.statusCode, 503);
		assert.deepEqual(JSON.parse(response.body), {
			error: 'LHV API unavailable',
		});
	});

	it('returns 500 when DB insert fails', async () => {
		mockFetchLhvTransactions.mock.mockImplementationOnce(async () => [
			{
				id: 'tx-1',
				bookingDate: '2026-04-01',
				amount: -15.5,
				currency: 'EUR',
				description: 'Coffee',
				accountId: 'EE123',
			},
		]);
		mockSql.mock.mockImplementationOnce(async () => {
			throw new Error('connection refused');
		});

		const app = Fastify();
		const { syncLhvRoute } = await import('../routes/sync-lhv.js');
		app.register(syncLhvRoute, {
			fetchTransactions: mockFetchLhvTransactions as any,
			sql: mockSql as any,
		});

		const response = await app.inject({ method: 'GET', url: '/sync-lhv' });
		assert.equal(response.statusCode, 500);
		assert.deepEqual(JSON.parse(response.body), {
			error: 'Database error',
		});
	});
});
