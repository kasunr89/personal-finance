import type { EnableBankingSession } from './enablebanking-auth-provider.js';

export interface EnableBankingTransaction {
	entry_reference: string;
	transaction_id: string | null;
	booking_date: string;
	transaction_amount: { amount: string; currency: string };
	remittance_information_unstructured: string;
	remittance_information: string[];
	credit_debit_indicator: string;
	creditor: { name: string | null } | null;
	debtor: { name: string | null } | null;
	[key: string]: unknown;
}

export interface EnableBankingHttpPort {
	startAuth(
		aspsp: { name: string; country: string },
		redirectUrl: string,
		validUntil: string,
	): Promise<{ url: string }>;
	createSession(code: string): Promise<EnableBankingSession>;
	getSession(sessionId: string): Promise<EnableBankingSession>;
	deleteSession(sessionId: string): Promise<void>;
	getAllTransactions(
		accountUid: string,
		dateFrom: string,
	): Promise<EnableBankingTransaction[]>;
}
