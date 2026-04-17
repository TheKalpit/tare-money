export const ACCOUNT_PREFIX = "Accounts/";
export const CATEGORY_PREFIX = "Categories/";
export const ACCOUNT_SEPARATOR = "/";
export const DEBOUNCE_MS = 300;
export const DEFAULT_TRANSACTIONS_DIR = "transactions";

export const NUMBER_FORMATS: { locale: string; label: string }[] = [
	{ locale: "en-US", label: "1,234,567.89" },
	{ locale: "en-IN", label: "12,34,567.89" },
	{ locale: "de-DE", label: "1.234.567,89" },
	{ locale: "fr-FR", label: "1 234 567,89" },
	{ locale: "de-CH", label: "1'234'567.89" },
];
