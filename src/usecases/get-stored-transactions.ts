import type { TransactionRepo } from '../ports/transaction-repo.js';
import type { StoredTransaction } from '../domain/types.js';

export async function getStoredTransactions(repo: TransactionRepo): Promise<StoredTransaction[]> {
	return repo.getTransactions();
}
