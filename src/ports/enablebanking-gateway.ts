import type { BankSession } from '../domain/types.js';
import type { Transaction } from '../domain/types.js';

export interface EnableBankingGateway {
	startAuth(
		aspsp: { name: string; country: string },
		redirectUrl: string,
		validUntil: string,
	): Promise<{ url: string }>;
	createSession(code: string): Promise<BankSession>;
	getSession(sessionId: string): Promise<BankSession>;
	deleteSession(sessionId: string): Promise<void>;
	getAllTransactions(
		accountUid: string,
		dateFrom: string,
	): Promise<Transaction[]>;
}
