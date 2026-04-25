import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { createDb } from '../db/create-db.js';
import type { Database } from '../../adapters/db/schema.js';
import type { Kysely } from 'kysely';

declare module 'fastify' {
	interface FastifyInstance {
		db: Kysely<Database>;
	}
}

export const dbPlugin = fp(async (app: FastifyInstance) => {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error('DATABASE_URL environment variable is required');
	}
	app.decorate('db', createDb(url));
	app.addHook('onClose', async () => {
		await app.db.destroy();
	});
});
