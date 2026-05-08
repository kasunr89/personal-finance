import type { FastifyInstance } from 'fastify';
import { postTestCategorizationRoute } from './post-test-categorization.js';

export default function privateRoutes(fastify: FastifyInstance) {
	fastify.register(postTestCategorizationRoute);
}
