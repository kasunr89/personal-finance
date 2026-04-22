import type { FastifyInstance } from 'fastify';
import internalRoutes from './internal/index.js';

interface Options {
    sandbox?: boolean;
}

export default function routes(fastify: FastifyInstance, opts: Options) {
    fastify.register(internalRoutes, { prefix: '/api/v1_internal', sandbox: opts.sandbox });
}