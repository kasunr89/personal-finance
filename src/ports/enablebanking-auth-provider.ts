export interface EnableBankingSession {
	status: string;
	accounts: string[];
	accounts_data: Array<{
		uid: string;
		identification_hash: string;
		identification_hashes: string[];
	}>;
	aspsp: { name: string; country: string };
	psu_type: string;
	psu_id_hash: string;
	access: {
		accounts: string[] | null;
		balances: boolean;
		transactions: boolean;
		valid_until: string;
	};
	created: string;
	authorized: string | null;
	closed: string | null;
}

export interface EnableBankingAuthProvider {
	startAuth(redirectUrl: string, validUntil: string): Promise<{ url: string }>;
	createSession(code: string): Promise<EnableBankingSession>;
	getSession(sessionId: string): Promise<EnableBankingSession>;
	deleteSession(sessionId: string): Promise<void>;
}
