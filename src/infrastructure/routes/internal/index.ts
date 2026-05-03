import type { FastifyInstance } from 'fastify';
import { getEnableBankingSessionRoute } from './get-enablebanking-session.js';
import { getEnableBankingTransactionsRoute } from './get-enablebanking-transactions.js';
import { deleteEnableBankingSessionRoute } from './delete-enablebanking-session.js';
import { getTransactionsRoute } from './get-transactions.js';
import { postSyncEnableBankingRoute } from './post-sync-enablebanking.js';

interface Options {
	sandbox?: boolean;
}

export default function internalRoutes(
	fastify: FastifyInstance,
	opts: Options,
) {
	fastify.register(getEnableBankingSessionRoute);
	fastify.register(getEnableBankingTransactionsRoute, { sandbox: opts.sandbox });
	fastify.register(deleteEnableBankingSessionRoute);
	fastify.register(getTransactionsRoute);
	fastify.register(postSyncEnableBankingRoute, { sandbox: opts.sandbox });
}
