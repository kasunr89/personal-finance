import type { ColumnType, Generated } from 'kysely';
import type { StoredTransaction } from '../../domain/types.js';

/** Kysely table definition for `transactions`. `id` and `created_at` are auto-generated. */
export interface TransactionsTable extends Omit<StoredTransaction, 'id' | 'created_at'> {
	id: Generated<number>;
	created_at: Generated<Date>;
}

export interface EnablebankingSessionsTable {
	id: string;
	created_at: Generated<Date>;
	expire_at: Date;
	connector: string;
	accounts: ColumnType<string[], string, string>;
}

export interface Database {
	transactions: TransactionsTable;
	enablebanking_sessions: EnablebankingSessionsTable;
}
