import type { FastifyInstance } from 'fastify';
import { enableBankingSessionRoute } from './enablebanking-session.js';
import { enableBankingTransactionsRoute } from './enablebanking-transactions.js';

interface Options {
    sandbox?: boolean;
}

export default function internalRoutes(fastify: FastifyInstance, opts: Options) {
    fastify.register(enableBankingSessionRoute);
    fastify.register(enableBankingTransactionsRoute, { sandbox: opts.sandbox });
}