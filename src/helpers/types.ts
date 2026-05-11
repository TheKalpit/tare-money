export interface AmountWithCurrency {
	amount: number;
	currency: string;
}

export interface PartialTransactionEntry {
	account: string;
	amount: number | null;
	currency: string | null;
	conversion?: AmountWithCurrency;
}

export interface TransactionEntry {
	account: string;
	amount: number;
	currency: string;
	conversion?: AmountWithCurrency;
}

export interface Transaction {
	date: string;
	description: string;
	tags: string[];
	entries: TransactionEntry[];
}
