import type { FastifyInstance } from 'fastify';
import type { TransactionRepo } from '../../../ports/transaction-repo.js';
import type { TransactionCategoryGateway } from '../../../ports/transaction-category-gateway.js';
import { NeonTransactionRepo } from '../../../adapters/db/neon-transaction-repo.js';
import { OpenAiClient } from '../../ai/openai-client.js';

interface Options {
	repo?: TransactionRepo;
	client?: TransactionCategoryGateway;
}

export async function getCategorizeTransactionRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const repo = opts.repo ?? new NeonTransactionRepo(fastify.db);
	const client = opts.client ?? new OpenAiClient();
	const secret = process.env.SYNC_SECRET;

	fastify.get<{ Params: { id: string } }>(
		'/categorize-transaction/:id',
		async (request, reply) => {
			const auth = request.headers.authorization;
			if (!secret || auth !== `Bearer ${secret}`) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const id = Number(request.params.id);
			const tx = await repo.getById(id);
			if (!tx) {
				return reply.status(404).send({ error: 'Transaction not found' });
			}

			try {
				const results = await client.categorize([{
					id: tx.id,
					description: tx.description,
					type: tx.type,
					creditor: tx.creditor,
					creditor_iban: tx.creditor_iban,
					debitor: tx.debitor,
					debitor_iban: tx.debitor_iban,
				}]);

				const result = results[0];
				if (!result) {
					return reply.status(500).send({ error: 'OpenAI categorization failed' });
				}

				return reply.send({ tx, result });
			} catch {
				return reply.status(500).send({ error: 'OpenAI categorization failed' });
			}
		},
	);
}
