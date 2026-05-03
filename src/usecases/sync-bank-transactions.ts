import type { BankGateway } from '../ports/bank-gateway.js';
import type { TransactionRepo } from '../ports/transaction-repo.js';

export async function syncTransactions(
	provider: BankGateway,
	repo: TransactionRepo,
	accountId: string,
): Promise<{ synced: number }> {
	const transactions = await provider.getTransactions();
	const synced = await repo.upsert(accountId, transactions);
	return { synced };
}
