import fs from 'fs';
import type { Transaction } from '../../domain/types.js';
import type { EnableBankingTransactionGateway } from '../../ports/enablebanking-transaction-gateway.js';

interface RawTransaction {
	entry_reference: string;
	transaction_id: string | null;
	booking_date: string;
	transaction_amount: { amount: string; currency: string };
	remittance_information: string[];
	credit_debit_indicator: 'CRDT' | 'DBIT';
}

export class FileEnableBankingClient implements EnableBankingTransactionGateway {
	constructor(
		private readonly filePath: string,
		private readonly accountId: string,
	) {}

	async getAllTransactions(): Promise<Transaction[]> {
		const raw: RawTransaction[] = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
		return raw.map((t) => ({
			id: '',
			accountId: this.accountId,
			amount:
				parseFloat(t.transaction_amount.amount) *
				(t.credit_debit_indicator === 'DBIT' ? -1 : 1),
			currency: t.transaction_amount.currency,
			description: t.remittance_information[0] ?? null,
			bookingDate: t.booking_date,
			source: 'sandbox',
			sourceId: t.transaction_id ?? t.entry_reference,
		}));
	}
}
