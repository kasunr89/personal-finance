import type { StoredTransaction, Transaction } from '../domain/types.js';

export interface TransactionRepo {
	/**
	 * Upsert transactions into the store.
	 * Returns the count of newly inserted rows (0 for duplicates).
	 * An empty array is a valid input and must return 0 without error.
	 */
	upsert(accountId: string, transactions: Transaction[]): Promise<number>;

	/**
	 * Fetch the most recent transactions from the store.
	 * Returns rows in their raw database shape (snake_case, DB-native types).
	 */
	getTransactions(): Promise<StoredTransaction[]>;
}
