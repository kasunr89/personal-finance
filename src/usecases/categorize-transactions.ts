import type { TransactionRepo } from '../ports/transaction-repo.js';
import type { TransactionCategoryGateway } from '../ports/transaction-category-gateway.js';

export async function categorizeTransactions(
	repo: TransactionRepo,
	client: TransactionCategoryGateway,
): Promise<{ categorized: number }> {
	const uncategorized = await repo.getUncategorized();
	if (uncategorized.length === 0) return { categorized: 0 };

	const results = await client.categorize(uncategorized);
	await repo.updateCategories(results);
	return { categorized: results.length };
}
