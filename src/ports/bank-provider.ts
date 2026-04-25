import type { Transaction } from '../domain/types.js';

export interface BankProvider {
	/**
	 * Fetch transactions from the bank. Adapters are expected to resolve
	 * date range, account context, and auth at construction time.
	 */
	getTransactions(): Promise<Transaction[]>;
}
