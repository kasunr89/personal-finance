import fs from 'fs';
import type { Transaction } from '../../domain/types.js';
import type { EnableBankingTransactionGateway } from '../../ports/enablebanking-transaction-gateway.js';
import type { EnableBankingRawTransaction } from '../types/enablebanking-raw-transaction.js';

export class FileEnableBankingClient implements EnableBankingTransactionGateway {
	constructor(private readonly filePath: string) {}

	async getAllTransactions(): Promise<Transaction[]> {
		const raw: EnableBankingRawTransaction[] = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));

		return raw.map((t) => ({
			referenceId: t.entry_reference,
			amount: {
				value: parseFloat(t.transaction_amount.amount),
				currency: t.transaction_amount.currency,
			},
			source: 'SANDBOX' as const,
			creditor: {
				name: t.creditor?.name ?? '',
				iban: t.creditor_account?.iban ?? '',
			},
			debitor: {
				name: t.debtor?.name ?? '',
				iban: t.debtor_account?.iban ?? '',
			},
			type: t.credit_debit_indicator === 'DBIT' ? 'DEBIT' : 'CREDIT',
			status: t.status,
			date: t.booking_date,
			description: t.remittance_information[0] ?? '',
		}));
	}
}
