import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('enablebanking_accounts')
		.addColumn('account_id', 'varchar(100)', (col) => col.primaryKey())
		.addColumn('created_at', 'timestamp', (col) =>
			col.notNull().defaultTo(sql`now()`),
		)
		.addColumn('expire_at', 'timestamp', (col) => col.notNull())
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('enablebanking_accounts').execute();
}
