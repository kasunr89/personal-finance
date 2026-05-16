import type { Generated } from 'kysely';
import type { StoredTransaction } from '../../domain/types.js';

/** Kysely table definition for `transactions`. `id` and `created_at` are auto-generated. */
export interface TransactionsTable extends Omit<StoredTransaction, 'id' | 'created_at'> {
	id: Generated<number>;
	created_at: Generated<Date>;
}

export interface EnablebankingAccountsTable {
	account_id: string;
	created_at: Generated<Date>;
	expire_at: Date;
}

export interface Database {
	transactions: TransactionsTable;
	enablebanking_accounts: EnablebankingAccountsTable;
}
