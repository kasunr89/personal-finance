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
					amount: t.amount.value as unknown as string,
					currency: t.amount.currency,
					description: t.description,
					source: t.source,
					source_reference_id: t.referenceId,
					type: t.type,
					date: t.date as unknown as Date,
					creditor: t.creditor.name || null,
					creditor_iban: t.creditor.iban || null,
					debitor: t.debitor.name || null,
					debitor_iban: t.debitor.iban || null,
				})
				.onConflict((oc) =>
					oc.columns(['source', 'source_reference_id']).doNothing(),
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
