import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('transactions')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('source', 'varchar(20)', (col) => col.notNull())
		.addColumn('source_reference_id', 'varchar(50)', (col) => col.notNull())
		.addColumn('amount', 'numeric(12, 2)', (col) => col.notNull())
		.addColumn('currency', 'varchar(3)', (col) => col.notNull())
		.addColumn('type', 'varchar(10)', (col) => col.notNull())
		.addColumn('creditor', 'varchar(100)')
		.addColumn('debitor', 'varchar(100)')
		.addColumn('description', 'text')
		.addColumn('date', 'date', (col) => col.notNull())
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.addUniqueConstraint('unique_source', ['source', 'source_reference_id'])
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('transactions').execute();
}
