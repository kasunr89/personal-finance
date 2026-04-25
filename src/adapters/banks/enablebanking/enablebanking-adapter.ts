import type { Transaction } from '../../../domain/types.js';
import type { BankProvider } from '../../../ports/bank-provider.js';
import type { EnableBankingHttpPort } from '../../../ports/enablebanking-http-port.js';

export class EnableBankingAdapter implements BankProvider {
	constructor(
		private client: EnableBankingHttpPort,
		private accountUid: string,
		private dateFrom: string,
	) {}

	async getTransactions(): Promise<Transaction[]> {
		return this.client.getAllTransactions(this.accountUid, this.dateFrom);
	}
}
