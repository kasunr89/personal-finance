import type { BankProvider } from '../ports/bank-provider.js';
import type { TransactionRepo } from '../ports/transaction-repo.js';
import type { StoredTransaction } from '../domain/types.js';

export async function syncTransactions(
	provider: BankProvider,
	repo: TransactionRepo,
): Promise<{ synced: number }> {
	const transactions = await provider.fetchTransactions();
	const synced = await repo.upsert(transactions);
	return { synced };
}

export async function getTransactions(
	repo: TransactionRepo,
): Promise<StoredTransaction[]> {
	return repo.getTransactions();
}
