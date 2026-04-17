/**
 * Parses transaction files in the format:
 *   YYYY-MM-DD description #tags
 *     Account/Path  amount CURRENCY  @@ convAmount CONVCURRENCY
 *
 * Rules:
 * - Comments start with ";" (inline or full-line)
 * - Entry lines are indented with 2+ spaces
 * - Accounts must start with "Accounts/" or "Categories/"
 * - Single-currency transactions: one entry amount can be inferred
 * - Multi-currency transactions: all amounts must be explicit
 * - Every transaction must be zero-sum (double-entry bookkeeping)
 * - Amounts are rounded to 2 decimal places
 */

import {
	Transaction,
	ParseError,
	ParseResult,
	AmountWithCurrency,
	PartialTransactionEntry,
} from "../helpers/types";
import {
	validateDate,
	validateDescription,
	validateAccount,
	validateAmount,
	validateCurrency,
	validateEntry,
	validateTransaction,
} from "../helpers/validation";
import { extractTags, ValidationError } from "../helpers/utils";

// YYYY-MM-DD followed by description text
const DATE_LINE = /^(\d{4}-\d{2}-\d{2})\s+(.+)$/;
// 2+ space indent, then account name, optionally followed by 1+ spaces and amount
const ENTRY_LINE = /^\s{2,}(\S+)(?:\s+(.+))?$/;

interface WorkingAmountWithCurrency {
	amount: string;
	currency: string;
}

interface WorkingTransaction {
	date: string;
	description: string;
	tags: string[];
	entries: PartialTransactionEntry[];
	lineNumber: number;
	rawContent?: string;
}

/** Strips inline comments (everything after ";"). */
function stripComment(line: string): string {
	const idx = line.indexOf(";");
	return (idx >= 0 ? line.substring(0, idx) : line).trimEnd();
}

/** Parses "amount CURRENCY" (e.g. "3500.00 INR"). Uses shared validators. */
function splitAmountAndCurrency(str: string): WorkingAmountWithCurrency {
	const parts = str.trim().split(/\s+/);
	if (parts.length !== 2 || !parts[0] || !parts[1]) {
		throw new ValidationError(`Invalid amount format: "${str}"`);
	}
	return { amount: parts[0], currency: parts[1] };
}

/**
 * Validates, infers missing amounts, and finalizes a parsed transaction.
 * Uses shared validators for cross-entry checks (inference rules, zero-sum).
 */
function finalizeTransaction(
	txn: WorkingTransaction,
	transactions: Transaction[],
	errors: ParseError[],
	filePath?: string,
): void {
	// Pre-inference validation (min entries, inference rules)
	try {
		const transaction = validateTransaction(
			txn.date,
			txn.description,
			txn.entries,
			txn.tags,
		);
		transactions.push(transaction);
	} catch (e) {
		if (e instanceof ValidationError) {
			errors.push({
				sourceFile: filePath,
				lineNumber: txn.lineNumber,
				lineContent: txn.rawContent ?? "",
				message: e.message,
			});
		} else {
			throw e;
		}
	}
}

/** Parses a single entry line and adds it to the current transaction. */
function parseEntryLine(
	entryMatch: RegExpExecArray,
	current: WorkingTransaction,
	lineNumber: number,
	lineContent: string,
	errors: ParseError[],
	filePath?: string,
): void {
	current.rawContent += "\n" + lineContent;

	let account: string;
	let primaryAmount: AmountWithCurrency | undefined;
	let conversionAmount: AmountWithCurrency | undefined;

	try {
		account = validateAccount(entryMatch[1]);
	} catch (e) {
		if (e instanceof ValidationError) {
			errors.push({
				sourceFile: filePath,
				lineNumber: lineNumber,
				lineContent: lineContent,
				message: e.message,
			});
		} else {
			throw e;
		}
		return;
	}

	const amountPart = entryMatch[2];
	if (amountPart) {
		const segments = amountPart.split("@@");
		if (segments.length > 2) {
			errors.push({
				sourceFile: filePath,
				lineNumber: lineNumber,
				lineContent: lineContent,
				message: `Multiple @@ found in: "${amountPart}"`,
			});
			return;
		}

		try {
			if (segments[0]) {
				const workingAmount = splitAmountAndCurrency(segments[0]);
				primaryAmount = {
					amount: validateAmount(workingAmount.amount),
					currency: validateCurrency(workingAmount.currency),
				};
			}
		} catch (e) {
			if (e instanceof ValidationError) {
				errors.push({
					sourceFile: filePath,
					lineNumber: lineNumber,
					lineContent: lineContent,
					message: e.message,
				});
			} else {
				throw e;
			}
			return;
		}

		try {
			if (segments.length === 2 && segments[1]) {
				// multi-currency conversion
				const workingAmount = splitAmountAndCurrency(segments[1]);
				conversionAmount = {
					amount: validateAmount(workingAmount.amount),
					currency: validateCurrency(workingAmount.currency),
				};
			}
		} catch (e) {
			if (e instanceof ValidationError) {
				errors.push({
					sourceFile: filePath,
					lineNumber: lineNumber,
					lineContent: lineContent,
					message: e.message,
				});
			} else {
				throw e;
			}
			return;
		}
	}

	try {
		// Cross-field validation — returns TransactionEntry or throws
		const transactionEntry = validateEntry(
			account,
			primaryAmount?.amount,
			primaryAmount?.currency,
			conversionAmount?.amount,
			conversionAmount?.currency,
		);
		current.entries.push(transactionEntry);
	} catch (e) {
		if (e instanceof ValidationError) {
			errors.push({
				sourceFile: filePath,
				lineNumber: lineNumber,
				lineContent: lineContent,
				message: e.message,
			});
		} else {
			throw e;
		}
	}
}

/**
 * Parses a PTA-format string into transactions and errors.
 *
 * Processing:
 * 1. Iterates lines, stripping comments
 * 2. Date lines start a new transaction; entry lines add to the current one
 * 3. Each completed transaction is validated (inference, zero-sum) via finalizeTransaction
 */
export function parse(input: string, filePath?: string): ParseResult {
	const lines = input.split("\n");
	const transactions: Transaction[] = [];
	const errors: ParseError[] = [];
	let current: WorkingTransaction | null = null;

	function flush() {
		if (current) {
			finalizeTransaction(current, transactions, errors, filePath);
			current = null;
		}
	}

	for (let i = 0; i < lines.length; i++) {
		const lineNumber = i + 1;
		const rawLine = lines[i] ?? "";
		const stripped = stripComment(rawLine);

		if (stripped.trim() === "") {
			continue;
		}

		const dateMatch = DATE_LINE.exec(stripped);
		if (dateMatch) {
			flush(); // finalize previous transaction before starting a new one

			let date: string | undefined;
			let description: string | undefined;

			try {
				date = validateDate(dateMatch[1]);
			} catch (e) {
				if (e instanceof ValidationError) {
					errors.push({
						sourceFile: filePath,
						lineNumber: lineNumber,
						lineContent: rawLine,
						message: e.message,
					});
				} else throw e;
			}

			try {
				description = validateDescription(dateMatch[2]);
			} catch (e) {
				if (e instanceof ValidationError) {
					errors.push({
						sourceFile: filePath,
						lineNumber: lineNumber,
						lineContent: rawLine,
						message: e.message,
					});
				} else throw e;
			}

			if (date && description) {
				current = {
					date: date,
					description: description,
					tags: extractTags(description),
					entries: [],
					lineNumber: lineNumber,
					rawContent: rawLine,
				};
			}
			continue;
		}

		const entryMatch = ENTRY_LINE.exec(stripped);
		if (entryMatch) {
			if (current) {
				parseEntryLine(
					entryMatch,
					current,
					lineNumber,
					rawLine,
					errors,
					filePath,
				);
				continue;
			}

			errors.push({
				sourceFile: filePath,
				lineNumber: lineNumber,
				lineContent: rawLine,
				message: "Entry line outside of a transaction",
			});
			continue;
		}

		errors.push({
			sourceFile: filePath,
			lineNumber: lineNumber,
			lineContent: rawLine,
			message: "Unrecognized syntax",
		});
	}

	flush(); // finalize the last transaction
	return { transactions, errors };
}
