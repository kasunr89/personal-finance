import type { FastifyInstance } from 'fastify';
import type { TransactionRepo } from '../../ports/transaction-repo.js';
import { NeonTransactionRepo } from '../../adapters/db/neon-transaction-repo.js';
import { getTransactions } from '../../usecases/sync-transactions.js';

interface TransactionsOptions {
	repo?: TransactionRepo;
}

export async function transactionsRoute(
	app: FastifyInstance,
	opts: TransactionsOptions = {},
) {
	const repo = opts.repo ?? new NeonTransactionRepo(app.db);

	app.get('/transactions', async (_request, reply) => {
		try {
			const transactions = await getTransactions(repo);
			return reply.send(transactions);
		} catch {
			return reply.status(500).send({ error: 'Failed to fetch transactions' });
		}
	});
}
