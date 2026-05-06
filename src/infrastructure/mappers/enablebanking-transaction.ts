import type { Transaction } from '../../domain/types.js';
import type { EnableBankingRawTransaction } from '../types/enablebanking-raw-transaction.js';

export function mapRawTransaction(
	t: EnableBankingRawTransaction,
	source: Transaction['source'],
): Transaction {
	return {
		referenceId: t.entry_reference,
		amount: {
			value: parseFloat(t.transaction_amount.amount),
			currency: t.transaction_amount.currency,
		},
		source,
		creditor: {
			name: t.debtor?.name ?? '',
			iban: t.debtor_account?.iban ?? '',
		},
		debitor: {
			name: t.creditor?.name ?? '',
			iban: t.creditor_account?.iban ?? '',
		},
		type: t.credit_debit_indicator === 'DBIT' ? 'debit' : 'credit',
		status: t.status,
		date: t.booking_date,
		description: t.remittance_information[0] ?? '',
	};
}
