import type { FastifyInstance } from 'fastify';
import type { BankProvider } from '../../ports/bank-provider.js';
import type { TransactionRepo } from '../../ports/transaction-repo.js';
import { EnableBankingProvider } from '../../adapters/banks/enablebanking/enablebanking-provider.js';
import { NeonTransactionRepo } from '../../adapters/db/neon-transaction-repo.js';
import { syncTransactions } from '../../usecases/sync-transactions.js';
import { createDb } from '../../adapters/db/kysely.js';

interface SyncEnableBankingOptions {
	provider?: BankProvider;
	repo?: TransactionRepo;
}

export async function syncEnableBankingRoute(
	app: FastifyInstance,
	opts: SyncEnableBankingOptions = {},
) {
	app.get('/sync-enablebanking', async (request, reply) => {
		const query = request.query as {
			accountUid?: string;
			dateFrom?: string;
		};

		if (!opts.provider && (!query.accountUid || !query.dateFrom)) {
			return reply.status(400).send({
				error: 'accountUid and dateFrom query params required',
			});
		}

		const repo =
			opts.repo ??
			new NeonTransactionRepo(createDb(process.env.DATABASE_URL!));
		const provider =
			opts.provider ??
			new EnableBankingProvider(query.accountUid!, query.dateFrom!);

		try {
			const result = await syncTransactions(provider, repo);
			return reply.send(result);
		} catch (err) {
			if (
				err instanceof Error &&
				err.message.startsWith('Enable Banking API error')
			) {
				return reply
					.status(503)
					.send({ error: 'Enable Banking API unavailable' });
			}
			return reply.status(500).send({ error: 'Sync error' });
		}
	});
}
