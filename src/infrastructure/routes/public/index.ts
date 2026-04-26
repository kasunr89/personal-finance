import type { FastifyInstance } from 'fastify';
import { getEnableBankingCallbackRoute } from './get-enablebanking-callback.js';

export default function publicRoutes(fastify: FastifyInstance) {
	fastify.register(getEnableBankingCallbackRoute);
}
