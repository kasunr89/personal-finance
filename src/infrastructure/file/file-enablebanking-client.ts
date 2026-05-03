import fs from 'fs';
import type { Transaction } from '../../domain/types.js';
import type { EnableBankingTransactionGateway } from '../../ports/enablebanking-transaction-gateway.js';

interface RawTransaction {
	entry_reference: string;
	transaction_id: string | null;
	booking_date: string;
	status: string;
	transaction_amount: { amount: string; currency: string };
	remittance_information: string[];
	credit_debit_indicator: 'CRDT' | 'DBIT';
	creditor: { name: string | null } | null;
	creditor_account: { iban: string | null } | null;
	debtor: { name: string | null } | null;
	debtor_account: { iban: string | null } | null;
}

export class FileEnableBankingClient implements EnableBankingTransactionGateway {
	constructor(private readonly filePath: string) {}

	async getAllTransactions(): Promise<Transaction[]> {
		const raw: RawTransaction[] = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));

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
