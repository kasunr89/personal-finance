export interface EnablebankingAccount {
	account_id: string;
	expire_at: Date;
}

export interface AccountRepo {
	getAll(): Promise<EnablebankingAccount[]>;
}
