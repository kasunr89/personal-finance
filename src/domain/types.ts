export interface BankSession {
	status: string;
	accounts: string[];
	accountsData: Array<{ uid: string; identificationHash: string }>;
	validUntil: string;
}

/** A transaction row as returned from the database (snake_case, DB-native types). */
export interface StoredTransaction {
	id: number;
	/** Stored as a decimal string by the database (e.g. "12.39"). */
	amount: string;
	currency: string;
	description: string | null;
	source: string;
	source_reference_id: string;
	type: string;
	date: Date;
	created_at: Date;
	creditor: string | null;
	creditor_iban: string | null;
	debitor: string | null;
	debitor_iban: string | null;
}

export interface Transaction {
	referenceId: string;
	amount: {
		value: number;
		currency: string;
	};
	creditor: {
		name: string | null;
		iban: string | null;
	};
	debitor: {
		name: string | null;
		iban: string | null;
	};
	source: 'lhv' | 'wise' | 'lhv-sandbox'; 
	type: 'credit' | 'debit';
	status: string;
	date: string;
	description: string;
}
