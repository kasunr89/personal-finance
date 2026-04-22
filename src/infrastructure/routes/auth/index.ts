import type { FastifyInstance } from 'fastify';
import { enableBankingStartRoute } from './enablebanking-start.js';

export default function authRoutes(fastify: FastifyInstance) {
    fastify.register(enableBankingStartRoute);
}
