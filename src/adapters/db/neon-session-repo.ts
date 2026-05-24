import { sql, type Kysely } from 'kysely';
import type { SessionRepo, EnablebankingSession } from '../../ports/session-repo.js';
import type { Database } from './schema.js';

export class NeonSessionRepo implements SessionRepo {
	constructor(private db: Kysely<Database>) {}

	async getAll(): Promise<EnablebankingSession[]> {
		const rows = await this.db
			.selectFrom('enablebanking_sessions')
			.select(['id', 'bank_key', 'expire_at', 'accounts'])
			.where('expire_at', '>', sql<Date>`now()`)
			.execute();
		return rows as EnablebankingSession[];
	}

	async getByBankKey(bankKey: string): Promise<EnablebankingSession[]> {
		const rows = await this.db
			.selectFrom('enablebanking_sessions')
			.select(['id', 'bank_key', 'expire_at', 'accounts'])
			.where('bank_key', '=', bankKey)
			.where('expire_at', '>', sql<Date>`now()`)
			.execute();
		return rows as EnablebankingSession[];
	}

	async deleteByBankKey(bankKey: string): Promise<void> {
		await this.db
			.deleteFrom('enablebanking_sessions')
			.where('bank_key', '=', bankKey)
			.execute();
	}

	async upsert(session: EnablebankingSession): Promise<void> {
		await this.db
			.insertInto('enablebanking_sessions')
			.values({ ...session, accounts: JSON.stringify(session.accounts) })
			.onConflict((oc) =>
				oc.column('id').doUpdateSet((eb) => ({
					bank_key: eb.ref('excluded.bank_key'),
					expire_at: eb.ref('excluded.expire_at'),
					accounts: eb.ref('excluded.accounts'),
				})),
			)
			.execute();
	}
}
