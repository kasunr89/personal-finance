export interface EnableBankingRawTransaction {
	entry_reference: string;
	transaction_id: string | null;
	booking_date: string;
	status: string;
	transaction_amount: { amount: string; currency: string };
	remittance_information: string[];
	credit_debit_indicator: 'CRDT' | 'DBIT';
	creditor: { name: string | null };
	creditor_account: { iban: string } | null;
	debtor: { name: string | null };
	debtor_account: { iban: string } | null;
}
