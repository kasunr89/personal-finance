import type { Transaction } from '../../../domain/types.js';
import type { BankProvider } from '../../../ports/bank-provider.js';
import type { EnableBankingHttpPort } from '../../../ports/enablebanking-http-port.js';

export class EnableBankingAdapter implements BankProvider {
	constructor(
		private client: EnableBankingHttpPort,
		private accountUid: string,
		private dateFrom: string,
	) {}

	async fetchTransactions(): Promise<Transaction[]> {
		const raw = await this.client.fetchAllTransactions(
			this.accountUid,
			this.dateFrom,
		);

		return raw.map(
			(t): Transaction => ({
				id: '',
				accountId: this.accountUid,
				amount: parseFloat(t.transaction_amount.amount),
				currency: t.transaction_amount.currency,
				description: t.remittance_information[0] ?? null,
				bookingDate: t.booking_date,
				source: 'enablebanking',
				sourceId: t.transaction_id ?? t.entry_reference,
			}),
		);
	}
}
