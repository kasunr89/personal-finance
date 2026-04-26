import type { Transaction } from '../../../domain/types.js';
import type { BankGateway } from '../../../ports/bank-gateway.js';
import type { EnableBankingGateway } from '../../../ports/enablebanking-gateway.js';

export class EnableBankingAdapter implements BankGateway {
	constructor(
		private client: EnableBankingGateway,
		private accountUid: string,
		private dateFrom: string,
	) {}

	async getTransactions(): Promise<Transaction[]> {
		return this.client.getAllTransactions(this.accountUid, this.dateFrom);
	}
}
