import type { FastifyInstance } from 'fastify';
import type { TransactionRepo } from '../../../ports/transaction-repo.js';
import type { TransactionCategoryGateway } from '../../../ports/transaction-category-gateway.js';
import { NeonTransactionRepo } from '../../../adapters/db/neon-transaction-repo.js';
import { OpenAiClient } from '../../ai/openai-client.js';
import { categorizeTransactions } from '../../../usecases/categorize-transactions.js';

interface Options {
	repo?: TransactionRepo;
	categoryClient?: TransactionCategoryGateway;
}

export async function postCategorizeTransactionsRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const repo = opts.repo ?? new NeonTransactionRepo(fastify.db);
	const categoryClient = opts.categoryClient ?? new OpenAiClient();
	const secret = process.env.SYNC_SECRET;

	fastify.post('/categorize-transactions', async (request, reply) => {
		const auth = request.headers.authorization;
		if (!secret || auth !== `Bearer ${secret}`) {
			return reply.status(401).send({ error: 'Unauthorized' });
		}

		try {
			const result = await categorizeTransactions(repo, categoryClient);
			return reply.send(result);
		} catch (err) {
			return reply.status(500).send({ error: 'Categorization error' });
		}
	});
}
