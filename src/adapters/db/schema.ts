import type { Generated } from 'kysely';
import type { StoredTransaction } from '../../domain/types.js';

/** Kysely table definition for `transactions`. `id` is auto-generated. */
export interface TransactionsTable extends Omit<StoredTransaction, 'id'> {
	id: Generated<number>;
}

export interface Database {
	transactions: TransactionsTable;
}
