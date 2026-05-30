import { sql, type Kysely } from 'kysely';
import type { SessionRepo, EnablebankingSession } from '../../ports/session-repo.js';
import type { Database } from './schema.js';

export class NeonSessionRepo implements SessionRepo {
	constructor(private db: Kysely<Database>) {}

	async getAll(): Promise<EnablebankingSession[]> {
		const rows = await this.db
			.selectFrom('enablebanking_sessions')
			.select(['id', 'connector', 'expire_at', 'accounts'])
			.where('expire_at', '>', sql<Date>`now()`)
			.execute();
		return rows as EnablebankingSession[];
	}

	async getByConnector(connector: string): Promise<EnablebankingSession[]> {
		const rows = await this.db
			.selectFrom('enablebanking_sessions')
			.select(['id', 'connector', 'expire_at', 'accounts'])
			.where('connector', '=', connector)
			.where('expire_at', '>', sql<Date>`now()`)
			.execute();
		return rows as EnablebankingSession[];
	}

	async deleteById(id: string): Promise<void> {
		await this.db
			.deleteFrom('enablebanking_sessions')
			.where('id', '=', id)
			.execute();
	}

	async deleteByConnector(connector: string): Promise<void> {
		await this.db
			.deleteFrom('enablebanking_sessions')
			.where('connector', '=', connector)
			.execute();
	}

	async upsert(session: EnablebankingSession): Promise<void> {
		await this.db
			.insertInto('enablebanking_sessions')
			.values({ ...session, accounts: JSON.stringify(session.accounts) })
			.onConflict((oc) =>
				oc.column('id').doUpdateSet((eb) => ({
					connector: eb.ref('excluded.connector'),
					expire_at: eb.ref('excluded.expire_at'),
					accounts: eb.ref('excluded.accounts'),
				})),
			)
			.execute();
	}
}
