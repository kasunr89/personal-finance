import fs from 'fs';
import type { Transaction } from '../../domain/types.js';
import type { EnableBankingTransactionGateway } from '../../ports/enablebanking-transaction-gateway.js';
import type { EnableBankingRawTransaction } from '../types/enablebanking-raw-transaction.js';
import { mapRawTransaction } from '../mappers/enablebanking-transaction.js';

export class FileEnableBankingClient implements EnableBankingTransactionGateway {
	constructor(private readonly filePath: string) {}

	async getAllTransactions(): Promise<Transaction[]> {
		const raw: EnableBankingRawTransaction[] = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));

		return raw
			.map((t) => mapRawTransaction(t, 'lhv-sandbox'));
	}
}
