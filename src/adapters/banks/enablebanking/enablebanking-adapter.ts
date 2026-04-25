import type { Transaction } from '../../../domain/types.js';
import type { BankProvider } from '../../../ports/bank-provider.js';
import type { EnableBankingGateway } from '../../../ports/enablebanking-gateway.js';

export class EnableBankingAdapter implements BankProvider {
	constructor(
		private client: EnableBankingGateway,
		private accountUid: string,
		private dateFrom: string,
	) {}

	async getTransactions(): Promise<Transaction[]> {
		return this.client.getAllTransactions(this.accountUid, this.dateFrom);
	}
}
