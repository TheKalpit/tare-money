import {
	ACCOUNT_PREFIX,
	ACCOUNT_SEPARATOR,
	CATEGORY_PREFIX,
} from "./constants";
import {
	TransactionEntry,
	Transaction,
	PartialTransactionEntry,
} from "./types";
import { ValidationError } from "./utils";

/** Validates and returns a trimmed date string (YYYY-MM-DD). */
export function validateDate(value?: string | Date | null): string {
	if (!value) throw new ValidationError("Date is required");
	if (value instanceof Date) {
		const y = value.getFullYear();
		const m = String(value.getMonth() + 1).padStart(2, "0");
		const d = String(value.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
		throw new ValidationError("Invalid date format (YYYY-MM-DD)");
	return value;
}

/** Validates and returns a trimmed description. */
export function validateDescription(value?: string): string {
	const trimmed = value?.trim();
	if (!trimmed) throw new ValidationError("Description is required");
	return trimmed;
}

/** Validates and returns a valid account name. */
export function validateAccount(value?: string): string {
	if (!value?.trim()) throw new ValidationError("Account is required");
	if (value.includes(" "))
		throw new ValidationError("Account name cannot contain spaces");
	if (!value.startsWith(ACCOUNT_PREFIX) && !value.startsWith(CATEGORY_PREFIX))
		throw new ValidationError(
			`Must start with "${ACCOUNT_PREFIX}" or "${CATEGORY_PREFIX}"`,
		);
	if (value.endsWith(ACCOUNT_SEPARATOR))
		throw new ValidationError("Account name is incomplete");
	if (value.includes(`${ACCOUNT_SEPARATOR}${ACCOUNT_SEPARATOR}`))
		throw new ValidationError("Account name has empty segments");
	return value;
}

/** Validates and returns a parsed number (rounded to 2 decimal places). */
export function validateAmount(value: string): number {
	if (!/^-?\d[\d,]*(\.\d+)?$/.test(value))
		throw new ValidationError("Invalid number");
	const amount = Math.round(parseFloat(value.replace(/,/g, "")) * 100) / 100;
	if (amount === 0) throw new ValidationError("Amount cannot be zero");
	return amount;
}

/** Validates and returns a currency string. */
export function validateCurrency(value: string): string {
	if (/\s/.test(value))
		throw new ValidationError("Currency cannot contain spaces");
	return value;
}

/** Cross-field validation. Returns a typed TransactionEntry. */
export function validateEntry(
	validAccount: string,
	validAmount?: number | null,
	validCurrency?: string | null,
	validConversionAmount?: number | null,
	validConversionCurrency?: string | null,
): PartialTransactionEntry {
	const validEntry: PartialTransactionEntry = {
		account: validAccount,
		amount: null,
		currency: null,
	};

	if (validAmount && !validCurrency) {
		throw new ValidationError("Currency is required");
	}
	if (!validAmount && validCurrency) {
		throw new ValidationError(
			"Amount is required when currency is specified",
		);
	}

	if (validAmount && validCurrency) {
		validEntry.amount = validAmount;
		validEntry.currency = validCurrency;
	}

	// Conversion: both or neither
	if (validConversionAmount && !validConversionCurrency) {
		throw new ValidationError("Conversion currency is required");
	}
	if (!validConversionAmount && validConversionCurrency) {
		throw new ValidationError("Conversion amount is required");
	}

	if (validConversionAmount && !validAmount) {
		throw new ValidationError("Conversion requires primary amount");
	}

	if (validConversionAmount && validConversionCurrency) {
		validEntry.conversion = {
			amount: validConversionAmount,
			currency: validConversionCurrency,
		};
	}

	return validEntry;
}

function isTransactionEntry(e: PartialTransactionEntry): e is TransactionEntry {
	return !!e.amount && !!e.currency;
}

/** Cross-entry validation. Returns validated entries unchanged. */
export function validateTransaction(
	validDate: string,
	validDescription: string,
	partialEntries: PartialTransactionEntry[],
	tags: string[],
): Transaction {
	if (partialEntries.length < 2) {
		throw new ValidationError("At least 2 entries are required");
	}

	const { entries, nullEntries } = partialEntries.reduce(
		(acc, e) => {
			if (isTransactionEntry(e)) {
				acc.entries.push(e);
			} else {
				acc.nullEntries.push(e);
			}
			return acc;
		},
		{
			entries: [] as TransactionEntry[],
			nullEntries: [] as PartialTransactionEntry[],
		},
	);

	if (nullEntries.length > 1) {
		throw new ValidationError(
			"Only one entry amount can be inferred per transaction",
		);
	}
	const nullEntry = nullEntries[0] ?? null;

	const isMultiCurrency =
		partialEntries.some((e) => e.conversion) ||
		new Set(
			partialEntries
				.filter((e) => e.currency !== null)
				.map((e) => e.currency),
		).size > 1;

	if (nullEntry && isMultiCurrency) {
		throw new ValidationError(
			"Cannot infer amount in multi-currency transaction",
		);
	}

	// Accumulate balances per currency + infer missing amount if needed
	const balances = new Map<string, number>();

	for (const entry of entries) {
		const amt = entry.conversion ? entry.conversion.amount : entry.amount;
		const cur = entry.conversion?.currency || entry.currency;
		const sum = Math.round(((balances.get(cur) ?? 0) + amt) * 100) / 100;
		balances.set(cur, sum);
	}

	// Infer the null entry from the accumulated balances (single-currency only)
	if (nullEntry) {
		const [currency, total] = [...balances.entries()][0]!;
		nullEntry.amount = Math.round(-total * 100) / 100;
		nullEntry.currency = currency;
		if (isTransactionEntry(nullEntry)) {
			entries.push(nullEntry);
		}
		balances.set(currency, 0);
	}

	for (const [currency, total] of balances) {
		if (total !== 0) {
			throw new ValidationError(
				`Transaction does not balance: ${currency} off by ${total.toFixed(2)}`,
			);
		}
	}

	return {
		date: validDate,
		description: validDescription,
		entries: entries,
		tags: tags,
	};
}
