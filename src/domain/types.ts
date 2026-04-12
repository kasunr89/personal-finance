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
