import type { FastifyInstance } from 'fastify';
import { postCategorizeTransactionsRoute } from './post-categorize-transactions.js';
import { getCategorizeTransactionRoute } from './get-categorize-transaction.js';

export default function privateRoutes(fastify: FastifyInstance) {
	fastify.register(postCategorizeTransactionsRoute);
	fastify.register(getCategorizeTransactionRoute);
}
