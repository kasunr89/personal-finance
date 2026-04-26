import type { FastifyInstance } from 'fastify';
import { getEnableBankingStartRoute } from './get-enablebanking-start.js';

export default function authRoutes(fastify: FastifyInstance) {
	fastify.register(getEnableBankingStartRoute);
}
