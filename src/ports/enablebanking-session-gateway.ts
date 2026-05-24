import type { BankSession } from '../domain/types.js';

export interface EnableBankingSessionGateway {
	startAuth(redirectUrl: string, validUntil: string, aspsp: { name: string; country: string }): Promise<{ url: string }>;
	createSession(code: string): Promise<BankSession>;
	getSession(sessionId: string): Promise<BankSession>;
	deleteSession(sessionId: string): Promise<void>;
}
