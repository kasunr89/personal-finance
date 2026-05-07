import type { UncategorizedTransaction, CategoryResult } from '../domain/types.js';

export interface TransactionCategoryGateway {
	/**
	 * Categorize a batch of transactions in one API call.
	 * May return fewer results than input if the AI skips ambiguous transactions.
	 */
	categorize(transactions: UncategorizedTransaction[]): Promise<CategoryResult[]>;
}
