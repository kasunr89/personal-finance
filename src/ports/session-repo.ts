import type { BankKey } from '../domain/banks.js';

export interface EnablebankingSession {
	id: string;
	bank_key: BankKey;
	expire_at: Date;
	accounts: string[];
}

export interface SessionRepo {
	getAll(): Promise<EnablebankingSession[]>;
	getByBankKey(bankKey: BankKey): Promise<EnablebankingSession[]>;
	upsert(session: EnablebankingSession): Promise<void>;
	deleteByBankKey(bankKey: BankKey): Promise<void>;
}
