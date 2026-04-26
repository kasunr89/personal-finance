import type { FastifyInstance } from 'fastify';
import type { BankProvider } from '../../../ports/bank-provider.js';
import type { TransactionRepo } from '../../../ports/transaction-repo.js';
import { EnableBankingAdapter } from '../../../adapters/banks/enablebanking/enablebanking-adapter.js';
import { NeonTransactionRepo } from '../../../adapters/db/neon-transaction-repo.js';
import { EnableBankingClient } from '../../http/enablebanking-client.js';
import { syncTransactions } from '../../../usecases/sync-bank-transactions.js';

interface Options {
	provider?: BankProvider;
	repo?: TransactionRepo;
}

export async function postSyncEnableBankingRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const repo = opts.repo ?? new NeonTransactionRepo(fastify.db);

	const secret = process.env.SYNC_SECRET;

	fastify.post('/sync-enablebanking', async (request, reply) => {
		const auth = request.headers.authorization;
		if (!secret || auth !== `Bearer ${secret}`) {
			return reply.status(401).send({ error: 'Unauthorized' });
		}

		const query = request.query as {
			accountUid?: string;
			dateFrom?: string;
		};

		if (!opts.provider && (!query.accountUid || !query.dateFrom)) {
			return reply.status(400).send({
				error: 'accountUid and dateFrom query params required',
			});
		}

		const provider =
			opts.provider ??
			new EnableBankingAdapter(
				new EnableBankingClient(),
				query.accountUid!,
				query.dateFrom!,
			);

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
