import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('enablebanking_sessions')
		.addColumn('id', 'varchar(100)', (col) => col.primaryKey())
		.addColumn('accounts', 'jsonb', (col) => col.notNull().defaultTo(sql`'[]'`))
		.addColumn('bank_key', 'varchar(20)', (col) => col.notNull())
		.addColumn('expire_at', 'timestamp', (col) => col.notNull())
		.addColumn('created_at', 'timestamp', (col) =>
			col.notNull().defaultTo(sql`now()`),
		)
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('enablebanking_sessions').execute();
}
