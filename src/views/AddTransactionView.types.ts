/** Per-field errors for a single transaction entry row. */
export interface TransactionEntryFieldErrors {
	account?: string;
	amount?: string;
	currency?: string;
	conversionAmount?: string;
	conversionCurrency?: string;
	nonFieldError?: string;
}

/** All validation errors for the transaction form. */
export interface TransactionFormErrors {
	date?: string;
	description?: string;
	entries: Record<string, TransactionEntryFieldErrors>;
	nonFieldError?: string;
}

export interface TransactionFormEntry {
	id: string;
	account: string;
	amount?: string;
	currency?: string;
	conversionAmount?: string;
	conversionCurrency?: string;
}
