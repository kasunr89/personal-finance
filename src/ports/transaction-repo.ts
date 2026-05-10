import type { StoredTransaction, Transaction, UncategorizedTransaction, CategoryResult } from '../domain/types.js';

export interface TransactionRepo {
	/**
	 * Upsert transactions into the store.
	 * Returns the count of newly inserted rows (0 for duplicates).
	 * An empty array is a valid input and must return 0 without error.
	 */
	upsert(transactions: Transaction[]): Promise<number>;

	/**
	 * Fetch the most recent transactions from the store.
	 * Returns rows in their raw database shape (snake_case, DB-native types).
	 */
	getTransactions(): Promise<StoredTransaction[]>;

	/**
	 * Fetch all transactions where category is NULL.
	 */
	getUncategorized(): Promise<UncategorizedTransaction[]>;

	/**
	 * Update category and sub_category for the given transaction IDs.
	 */
	updateCategories(results: CategoryResult[]): Promise<void>;

	/**
	 * Fetch a single transaction by primary key. Returns null if not found.
	 */
	getById(id: number): Promise<StoredTransaction | null>;
}
