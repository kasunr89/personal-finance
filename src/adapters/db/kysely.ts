import { Kysely } from 'kysely';
import { NeonDialect } from 'kysely-neon';
import { neon } from '@neondatabase/serverless';
import type { Database } from './schema.js';

export function createDb(connectionString: string): Kysely<Database> {
	return new Kysely<Database>({
		dialect: new NeonDialect({ neon: neon(connectionString) }),
	});
}
