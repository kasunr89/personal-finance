export interface EnableBankingSession {
	session_id: string;
	accounts: Array<{ uid: string; iban?: string }>;
}

export interface EnableBankingAuthProvider {
	startAuth(redirectUrl: string, validUntil: string): Promise<{ url: string }>;
	createSession(code: string): Promise<EnableBankingSession>;
	getSession(sessionId: string): Promise<EnableBankingSession>;
	deleteSession(sessionId: string): Promise<void>;
}
