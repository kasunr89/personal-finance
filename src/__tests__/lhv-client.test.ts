import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Must import after mocking fetch
const mockFetch = mock.fn();
(global as any).fetch = mockFetch;

describe("fetchLhvTransactions", () => {
	beforeEach(() => {
		mockFetch.mock.resetCalls();
		process.env.LHV_CLIENT_ID = "test-client-id";
		process.env.LHV_API_KEY = "test-api-key";
	});

	it("returns transactions for the last 7 days", async () => {
		const mockTransactions = [
			{
				id: "tx-1",
				bookingDate: "2026-04-01",
				amount: -15.5,
				currency: "EUR",
				description: "Coffee",
				accountId: "EE123456789",
			},
		];

		(mockFetch as any).mock.mockImplementationOnce(async () => ({
			ok: true,
			json: async () => ({ transactions: mockTransactions }),
		}));

		const { fetchLhvTransactions } = await import("../lhv-client.js");
		const result = await fetchLhvTransactions();

		const calledUrl: string = (mockFetch as any).mock.calls[0].arguments[0];
		assert.match(
			calledUrl,
			/dateFrom=\d{4}-\d{2}-\d{2}&dateTo=\d{4}-\d{2}-\d{2}/,
		);

		assert.equal(result.length, 1);
		assert.equal(result[0].id, "tx-1");
		assert.equal(result[0].amount, -15.5);
	});

	it("throws when LHV API returns non-2xx", async () => {
		(mockFetch as any).mock.mockImplementationOnce(async () => ({
			ok: false,
			status: 401,
		}));

		const { fetchLhvTransactions } = await import("../lhv-client.js");
		await assert.rejects(() => fetchLhvTransactions(), {
			message: "LHV API error: 401",
		});
	});
});
