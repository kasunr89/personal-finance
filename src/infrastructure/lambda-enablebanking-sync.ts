import type { Handler } from 'aws-lambda';
import { createDb } from './db/create-db.js';
import { NeonAccountRepo } from '../adapters/db/neon-account-repo.js';
import { NeonTransactionRepo } from '../adapters/db/neon-transaction-repo.js';
import { EnableBankingAdapter } from '../adapters/banks/enablebanking/enablebanking-adapter.js';
import { EnableBankingClient } from './http/enablebanking-client.js';
import { FileEnableBankingClient } from './file/file-enablebanking-client.js';
import { syncTransactions } from '../usecases/sync-bank-transactions.js';

export const handler: Handler = async () => {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is required');

	const db = createDb(url);
	const accountRepo = new NeonAccountRepo(db);
	const txRepo = new NeonTransactionRepo(db);

	const accounts = await accountRepo.getAll();
	if (accounts.length === 0) {
		console.warn('No active Enable Banking accounts found — all expired or none seeded');
		return { synced: 0 };
	}

	const yesterday = new Date();
	yesterday.setUTCDate(yesterday.getUTCDate() - 1);
	const dateFrom = yesterday.toISOString().slice(0, 10);

	const sandbox = process.env.SANDBOX === 'true';

	const results: { account_id: string; synced: number }[] = [];
	for (const { account_id } of accounts) {
		const bankGateway = new EnableBankingAdapter(
			sandbox
				? new FileEnableBankingClient('data/transactions-2026-04-01.json')
				: new EnableBankingClient(),
			account_id,
			dateFrom,
		);
		const result = await syncTransactions(bankGateway, txRepo);
		console.log({ account_id, synced: result.synced, dateFrom });
		results.push({ account_id, synced: result.synced });
	}

	return { results };
};
