import type { FastifyInstance } from 'fastify';
import { enableBankingCallbackRoute } from './enablebanking-callback.js';

export default function publicRoutes(fastify: FastifyInstance) {
    fastify.register(enableBankingCallbackRoute);
}
