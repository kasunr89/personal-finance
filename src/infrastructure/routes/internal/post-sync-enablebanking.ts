import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import type { BankGateway } from '../../../ports/bank-gateway.js';
import type { TransactionRepo } from '../../../ports/transaction-repo.js';
import type { TransactionCategoryGateway } from '../../../ports/transaction-category-gateway.js';
import { EnableBankingAdapter } from '../../../adapters/banks/enablebanking/enablebanking-adapter.js';
import { NeonTransactionRepo } from '../../../adapters/db/neon-transaction-repo.js';
import { OpenAiClient } from '../../ai/openai-client.js';
import { EnableBankingClient } from '../../http/enablebanking-client.js';
import { FileEnableBankingClient } from '../../file/file-enablebanking-client.js';
import { syncTransactions } from '../../../usecases/sync-bank-transactions.js';
import { categorizeTransactions } from '../../../usecases/categorize-transactions.js';

const Body = Type.Object({
	account_id: Type.String({ minLength: 1 }),
	date_from: Type.String({ minLength: 1 }),
	source: Type.Union([Type.Literal('lhv'), Type.Literal('wise')]),
});

type Body = Static<typeof Body>;

interface Options {
	sandbox?: boolean;
	bankGateway?: BankGateway;
	repo?: TransactionRepo;
	categoryClient?: TransactionCategoryGateway;
}

export async function postSyncEnableBankingRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const repo = opts.repo ?? new NeonTransactionRepo(fastify.db);
	const categoryClient = opts.categoryClient ?? new OpenAiClient();
	const secret = process.env.SYNC_SECRET;

	fastify.post<{ Body: Body }>(
		'/sync-enablebanking',
		{ schema: { body: Body } },
		async (request, reply) => {
			const auth = request.headers.authorization;
			if (!secret || auth !== `Bearer ${secret}`) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const { account_id, date_from, source } = request.body;

			const bankGateway =
				opts.bankGateway ??
				new EnableBankingAdapter(
					opts.sandbox
						? new FileEnableBankingClient('data/transactions-2026-04-01.json')
						: new EnableBankingClient(),
					account_id,
					date_from,
					source,
				);

			try {
				const result = await syncTransactions(bankGateway, repo);
				categorizeTransactions(repo, categoryClient).catch(
					(err) => fastify.log.error({ err }, 'Background categorization failed'),
				);
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
		},
	);
}
