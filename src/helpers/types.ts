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

export interface ParseError {
	lineNumber: number;
	message: string;
	lineContent: string;
	sourceFile?: string;
}

export interface ParseResult {
	transactions: Transaction[];
	errors: ParseError[];
}

export type ViewTab = "balances" | "income-expenses";

export interface UserPreferences {
	activeTab: ViewTab;
	dateTo: string;
	dateFrom: string;
	hide_zero_balances: boolean;
}

export interface TareMoneySettings {
	transactionsDir: string;
	numberLocale: string;
}

export interface AppContextData {
	readonly transactions: Transaction[];
	readonly transactionsLoading: boolean;
	readonly transactionsStale: boolean;
	readonly parseErrors: ParseError[];
	readonly errors: string[];
	readonly accounts: Map<string, string>;
	readonly appSettings: TareMoneySettings;
	readonly userPreferences: UserPreferences;
	readonly searchQuery: string;
	readonly updateUserPreferences: (updates: Partial<UserPreferences>) => void;
	readonly updateSearchQuery: (query: string) => void;
	readonly reloadStaleData: () => Promise<void>;
	readonly openAddTransactionModal: () => void;
	readonly saveTransactionToFile: (transaction: Transaction) => Promise<void>;
}

export interface AccountBalance {
	currencies: Map<string, number>;
}

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
