import type { Kysely } from 'kysely';
import type { StoredTransaction, Transaction } from '../../domain/types.js';
import type { TransactionRepo } from '../../ports/transaction-repo.js';
import type { Database } from './schema.js';

export class NeonTransactionRepo implements TransactionRepo {
	constructor(private db: Kysely<Database>) {}

	async upsert(transactions: Transaction[]): Promise<number> {
		let count = 0;
		for (const t of transactions) {
			const result = await this.db
				.insertInto('transactions')
				.values({
					account_id: t.accountId,
					amount: t.amount as unknown as string,
					currency: t.currency,
					description: t.description,
					source: t.source,
					source_id: t.sourceId,
					created_at: t.bookingDate as unknown as Date,
				})
				.onConflict((oc) =>
					oc.columns(['account_id', 'source', 'source_id']).doNothing(),
				)
				.returning('id')
				.executeTakeFirst();
			if (result) count++;
		}
		return count;
	}

	async getTransactions(): Promise<StoredTransaction[]> {
		return this.db.selectFrom('transactions').selectAll().execute();
	}
}
