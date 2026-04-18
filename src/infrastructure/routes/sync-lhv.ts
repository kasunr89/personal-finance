import type { FastifyInstance } from 'fastify';
import type { BankProvider } from '../../ports/bank-provider.js';
import type { TransactionRepo } from '../../ports/transaction-repo.js';
import { LhvProvider } from '../../adapters/banks/lhv/lhv-provider.js';
import { NeonTransactionRepo } from '../../adapters/db/neon-transaction-repo.js';
import { syncTransactions } from '../../usecases/sync-transactions.js';
import { createDb } from '../../adapters/db/kysely.js';

interface SyncLhvOptions {
	provider?: BankProvider;
	repo?: TransactionRepo;
}

export async function syncLhvRoute(
	app: FastifyInstance,
	opts: SyncLhvOptions = {},
) {
	app.get('/sync-lhv', async (_request, reply) => {
		const repo =
			opts.repo ?? new NeonTransactionRepo(createDb(process.env.DATABASE_URL!));
		const provider = opts.provider ?? new LhvProvider();

		try {
			const result = await syncTransactions(provider, repo);
			return reply.send(result);
		} catch (err) {
			if (
				err instanceof Error &&
				err.message.startsWith('LHV API error')
			) {
				return reply.status(503).send({ error: 'LHV API unavailable' });
			}
			return reply.status(500).send({ error: 'Sync error' });
		}
	});
}
