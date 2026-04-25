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
	/** Database-assigned identifier. Empty string for unsaved transactions. */
	id: string;
	accountId: string;
	/** Negative for debits, positive for credits. Adapters are responsible for applying sign. */
	amount: number;
	currency: string;
	description: string;
	/** ISO 8601 date string, format: YYYY-MM-DD */
	bookingDate: string;
	/** Bank identifier, e.g. 'lhv', 'enablebanking', 'wise' */
	source: string;
	/** The bank's own transaction ID */
	sourceId: string;
}
