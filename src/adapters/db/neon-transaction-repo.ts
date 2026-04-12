import type { Transaction } from '../../domain/types.js';
import type { TransactionRepo } from '../../ports/transaction-repo.js';

type SqlTaggedTemplate = (
	strings: TemplateStringsArray,
	...values: unknown[]
) => Promise<Record<string, unknown>[]>;

export class NeonTransactionRepo implements TransactionRepo {
	constructor(private sql: SqlTaggedTemplate) {}

	async upsert(transactions: Transaction[]): Promise<number> {
		let count = 0;
		for (const t of transactions) {
			const rows = await this.sql`
        INSERT INTO transactions (account_id, amount, currency, description, source, source_id, created_at)
        VALUES (${t.accountId}, ${t.amount}, ${t.currency}, ${t.description}, ${t.source}, ${t.sourceId}, ${t.bookingDate})
        ON CONFLICT (account_id, source, source_id) DO NOTHING
        RETURNING id
      `;
			count += rows.length;
		}
		return count;
	}
}
