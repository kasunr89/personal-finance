import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { categorizeTransactions } from '../../src/usecases/categorize-transactions.js';
import type { TransactionRepo } from '../../src/ports/transaction-repo.js';
import type { TransactionCategoryGateway } from '../../src/ports/transaction-category-gateway.js';
import type { UncategorizedTransaction, CategoryResult } from '../../src/domain/types.js';

const uncategorized: UncategorizedTransaction[] = [
	{ id: 1, description: 'BOLT.EU/R/123', type: 'credit' },
	{ id: 2, description: 'Pipedrive payroll', type: 'debit' },
];

const aiResults: CategoryResult[] = [
	{ id: 1, category: 'Transport', sub_category: 'Ride-hailing' },
	{ id: 2, category: 'Income', sub_category: 'Salary' },
];

function makeRepo(overrides: Partial<TransactionRepo> = {}): TransactionRepo {
	return {
		upsert: mock.fn(async () => 0),
		getTransactions: mock.fn(async () => []),
		getUncategorized: mock.fn(async () => uncategorized),
		updateCategories: mock.fn(async () => undefined),
		...overrides,
	};
}

function makeClient(results: CategoryResult[] = aiResults): TransactionCategoryGateway {
	return {
		categorize: mock.fn(async () => results),
	};
}

describe('categorizeTransactions', () => {
	it('fetches uncategorized, calls AI, updates DB', async () => {
		const repo = makeRepo();
		const client = makeClient();

		const result = await categorizeTransactions(repo, client);

		assert.equal(result.categorized, 2);
		assert.equal((repo.getUncategorized as any).mock.calls.length, 1);
		assert.deepEqual(
			(client.categorize as any).mock.calls[0].arguments[0],
			uncategorized,
		);
		assert.deepEqual(
			(repo.updateCategories as any).mock.calls[0].arguments[0],
			aiResults,
		);
	});

	it('returns zero and skips AI call when nothing to categorize', async () => {
		const repo = makeRepo({
			getUncategorized: mock.fn(async () => []),
		});
		const client = makeClient();

		const result = await categorizeTransactions(repo, client);

		assert.equal(result.categorized, 0);
		assert.equal((client.categorize as any).mock.calls.length, 0);
		assert.equal((repo.updateCategories as any).mock.calls.length, 0);
	});

	it('returns count of AI results, not input count (handles partial AI response)', async () => {
		const repo = makeRepo();
		const partialResults: CategoryResult[] = [
			{ id: 1, category: 'Transport', sub_category: 'Ride-hailing' },
		];
		const client = makeClient(partialResults);

		const result = await categorizeTransactions(repo, client);

		assert.equal(result.categorized, 1);
		assert.deepEqual(
			(repo.updateCategories as any).mock.calls[0].arguments[0],
			partialResults,
		);
	});

	it('propagates repo errors', async () => {
		const repo = makeRepo({
			getUncategorized: mock.fn(async () => {
				throw new Error('DB down');
			}),
		});
		const client = makeClient();

		await assert.rejects(() => categorizeTransactions(repo, client), {
			message: 'DB down',
		});
	});

	it('propagates AI client errors', async () => {
		const repo = makeRepo();
		const client: TransactionCategoryGateway = {
			categorize: mock.fn(async () => {
				throw new Error('Anthropic API error');
			}),
		};

		await assert.rejects(() => categorizeTransactions(repo, client), {
			message: 'Anthropic API error',
		});
	});
});
