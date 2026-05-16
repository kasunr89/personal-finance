import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { TransactionRepo } from '../../../src/ports/transaction-repo.js';
import type { TransactionCategoryGateway } from '../../../src/ports/transaction-category-gateway.js';
import type { StoredTransaction } from '../../../src/domain/types.js';

process.env.SYNC_SECRET = 'test-secret';

const AUTH = 'Bearer test-secret';

const storedTx: StoredTransaction = {
	id: 1,
	amount: '50.00',
	currency: 'EUR',
	description: 'parking',
	source: 'lhv',
	source_reference_id: 'tx-1',
	type: 'debit',
	date: new Date('2026-05-01'),
	created_at: new Date('2026-05-01'),
	creditor: 'John Doe',
	creditor_iban: 'EE999999999999999999',
	debitor: null,
	debitor_iban: null,
	category: null,
	sub_category: null,
};

function makeRepo(overrides: Partial<TransactionRepo> = {}): TransactionRepo {
	return {
		upsert: mock.fn(async () => 0),
		getTransactions: mock.fn(async () => []),
		getUncategorized: mock.fn(async () => []),
		updateCategories: mock.fn(async () => undefined),
		getById: mock.fn(async () => storedTx),
		...overrides,
	};
}

function makeClient(): TransactionCategoryGateway {
	return {
		categorize: mock.fn(async () => [
			{ id: 1, category: 'Income', sub_category: 'Rental' },
		]),
	};
}

async function buildApp(repo: TransactionRepo, client: TransactionCategoryGateway) {
	const app = Fastify({ logger: false });
	const { getCategorizeTransactionRoute } =
		await import('../../../src/infrastructure/routes/private/get-categorize-transaction.js');
	app.register(getCategorizeTransactionRoute, { repo, client });
	return app;
}

describe('GET /categorize-transaction/:id', () => {
	it('returns 401 when Authorization header is missing', async () => {
		const app = await buildApp(makeRepo(), makeClient());
		const response = await app.inject({ method: 'GET', url: '/categorize-transaction/1' });
		assert.equal(response.statusCode, 401);
		assert.deepEqual(JSON.parse(response.body), { error: 'Unauthorized' });
	});

	it('returns 401 when Authorization header is wrong', async () => {
		const app = await buildApp(makeRepo(), makeClient());
		const response = await app.inject({
			method: 'GET',
			url: '/categorize-transaction/1',
			headers: { authorization: 'Bearer wrong' },
		});
		assert.equal(response.statusCode, 401);
		assert.deepEqual(JSON.parse(response.body), { error: 'Unauthorized' });
	});

	it('returns 404 when transaction is not found', async () => {
		const repo = makeRepo({ getById: mock.fn(async () => null) });
		const app = await buildApp(repo, makeClient());
		const response = await app.inject({
			method: 'GET',
			url: '/categorize-transaction/99',
			headers: { authorization: AUTH },
		});
		assert.equal(response.statusCode, 404);
		assert.deepEqual(JSON.parse(response.body), { error: 'Transaction not found' });
	});

	it('returns category result when transaction exists', async () => {
		const app = await buildApp(makeRepo(), makeClient());
		const response = await app.inject({
			method: 'GET',
			url: '/categorize-transaction/1',
			headers: { authorization: AUTH },
		});
		assert.equal(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.deepEqual(body.result, [{ id: 1, category: 'Income', sub_category: 'Rental' }]);
		assert.equal(body.tx.id, 1);
	});

	it('returns empty result array when OpenAI returns no results', async () => {
		const client: TransactionCategoryGateway = {
			categorize: mock.fn(async () => []),
		};
		const app = await buildApp(makeRepo(), client);
		const response = await app.inject({
			method: 'GET',
			url: '/categorize-transaction/1',
			headers: { authorization: AUTH },
		});
		assert.equal(response.statusCode, 200);
		assert.deepEqual(JSON.parse(response.body).result, []);
	});

	it('returns 500 when OpenAI throws', async () => {
		const client: TransactionCategoryGateway = {
			categorize: mock.fn(async () => {
				throw new Error('API error');
			}),
		};
		const app = await buildApp(makeRepo(), client);
		const response = await app.inject({
			method: 'GET',
			url: '/categorize-transaction/1',
			headers: { authorization: AUTH },
		});
		assert.equal(response.statusCode, 500);
		assert.deepEqual(JSON.parse(response.body), { error: 'OpenAI categorization failed' });
	});
});
