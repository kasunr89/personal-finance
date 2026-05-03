export interface BankSession {
	status: string;
	accounts: string[];
	accountsData: Array<{ uid: string; identificationHash: string }>;
	validUntil: string;
}

/** A transaction row as returned from the database (snake_case, DB-native types). */
export interface StoredTransaction {
	/** Auto-incremented database primary key. */
	id: number;
	account_id: string;
	/** Stored as a decimal string by the database (e.g. "12.39"). */
	amount: string;
	currency: string;
	description: string;
	/** ISO 4217 source bank identifier, e.g. 'LHV', 'enablebanking'. */
	source: string;
	source_id: string;
	/** The booking date stored as a JS Date by the Neon driver. */
	created_at: Date;
}

export interface Transaction {
	referenceId: string;
	amount: {
		value: number;
		currency: string;
	};
	creditor: {
		name: string;
		iban: string;
	};
	debitor: {
		name: string;
		iban: string;
	};
	source: 'SANDBOX' | 'ENABLEBANKING' | 'WISE'; 
	type: 'CREDIT' | 'DEBIT';
	status: string;
	date: string;
	description: string;
}
