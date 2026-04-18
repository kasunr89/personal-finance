import type { BankProvider } from '../ports/bank-provider.js';
import type { TransactionRepo } from '../ports/transaction-repo.js';

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
): Promise<void> {
	await repo.getTransactions();
}