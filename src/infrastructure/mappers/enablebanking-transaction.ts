import type { ConnectorKey } from '../../domain/banks.js';
import type { Transaction } from '../../domain/types.js';
import type { EnableBankingRawTransaction } from '../types/enablebanking-raw-transaction.js';

export function mapRawTransaction(
	t: EnableBankingRawTransaction,
	source: ConnectorKey,
): Transaction {
	return {
		referenceId: t.entry_reference,
		amount: {
			value: parseFloat(t.transaction_amount.amount),
			currency: t.transaction_amount.currency,
		},
		source,
		creditor: {
			name: t.debtor.name ?? null,
			iban: t.debtor_account?.iban ?? null,
		},
		debitor: {
			name: t.creditor.name ?? null,
			iban: t.creditor_account?.iban ?? null,
		},
		type: t.credit_debit_indicator === 'DBIT' ? 'credit' : 'debit',
		status: t.status,
		date: t.booking_date,
		description: t.remittance_information[0] ?? '',
	};
}
