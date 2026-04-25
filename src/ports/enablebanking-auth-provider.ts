import type { BankSession } from '../domain/types.js';

export interface EnableBankingAuthProvider {
	startAuth(
		redirectUrl: string,
		validUntil: string,
	): Promise<{ url: string }>;
	createSession(code: string): Promise<BankSession>;
	getSession(sessionId: string): Promise<BankSession>;
	deleteSession(sessionId: string): Promise<void>;
}
