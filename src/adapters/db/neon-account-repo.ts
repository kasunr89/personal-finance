import { sql, type Kysely } from 'kysely';
import type { AccountRepo, EnablebankingAccount } from '../../ports/account-repo.js';
import type { Database } from './schema.js';

export class NeonAccountRepo implements AccountRepo {
	constructor(private db: Kysely<Database>) {}

	async getAll(): Promise<EnablebankingAccount[]> {
		return this.db
			.selectFrom('enablebanking_accounts')
			.select(['account_id', 'expire_at'])
			.where('expire_at', '>', sql<Date>`now()`)
			.execute();
	}
}
