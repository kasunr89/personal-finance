import type { FastifyInstance } from 'fastify';
import internalRoutes from './internal/index.js';
import privateRoutes from './private/index.js';
import authRoutes from './auth/index.js';
import publicRoutes from './public/index.js';

interface Options {
	sandbox?: boolean;
}

export default function routes(fastify: FastifyInstance, opts: Options) {
	fastify.register(publicRoutes);
	fastify.register(internalRoutes, {
		prefix: '/api/v1_internal',
		sandbox: opts.sandbox,
	});
	fastify.register(privateRoutes, { prefix: '/api/v1_private' });
	fastify.register(authRoutes, { prefix: '/auth' });
}
