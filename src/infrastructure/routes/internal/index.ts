import type { FastifyInstance } from 'fastify';
import { enableBankingSessionRoute } from './enablebanking-session.js';
import { enableBankingTransactionsRoute } from './enablebanking-transactions.js';
import { enableBankingDeleteSessionRoute } from './enablebanking-delete-session.js';
import { getTransactionsRoute } from './get-transactions.js';
import { postSyncEnableBankingRoute } from './post-sync-enablebanking.js';

interface Options {
    sandbox?: boolean;
}

export default function internalRoutes(fastify: FastifyInstance, opts: Options) {
    fastify.register(enableBankingSessionRoute);
    fastify.register(enableBankingTransactionsRoute, { sandbox: opts.sandbox });
    fastify.register(enableBankingDeleteSessionRoute);
    fastify.register(getTransactionsRoute);
    fastify.register(postSyncEnableBankingRoute);
}