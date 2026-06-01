import type { ConnectorKey } from '../../../domain/banks.js';
import type { Transaction } from '../../../domain/types.js';
import type { BankGateway } from '../../../ports/bank-gateway.js';
import type { EnableBankingTransactionGateway } from '../../../ports/enablebanking-transaction-gateway.js';

export class EnableBankingAdapter implements BankGateway {
	constructor(
		private client: EnableBankingTransactionGateway,
		private accountUid: string,
		private dateFrom: string,
		private source: ConnectorKey,
	) {}

	async getTransactions(): Promise<Transaction[]> {
		return this.client.getAllTransactions(this.accountUid, this.dateFrom, this.source);
	}
}
