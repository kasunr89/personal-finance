import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { dbPlugin } from '../../../src/infrastructure/plugins/db.js';

describe('dbPlugin', () => {
	let app: FastifyInstance;

	after(async () => {
		await app.close();
	});

	it('decorates app.db with a Kysely instance', async () => {
		process.env.DATABASE_URL = 'postgresql://user:pass@localhost/test';
		app = Fastify();
		app.register(dbPlugin);
		await app.ready();
		assert.ok(app.db, 'app.db should be defined');
		assert.strictEqual(
			typeof app.db.selectFrom,
			'function',
			'app.db should expose Kysely query builder',
		);
		assert.strictEqual(
			typeof app.db.destroy,
			'function',
			'app.db should expose Kysely destroy method',
		);
	});

	it('throws if DATABASE_URL is not set', async () => {
		delete process.env.DATABASE_URL;
		app = Fastify();
		app.register(dbPlugin);
		await assert.rejects(async () => {
			await app.ready();
		}, /DATABASE_URL environment variable is required/);
	});
});
