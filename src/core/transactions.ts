import { Vault, TFile, TFolder } from "obsidian";
import { Transaction, ParseError, ParseResult } from "../helpers/types";
import { parse } from "./parser";

/**
 * Loads and parses all .md files from the transactions directory.
 * Each file is parsed independently; results are merged and sorted by date.
 * Returns empty results (no error) if the directory doesn't exist yet.
 */
export async function loadTransactions(
	vault: Vault,
	transactionsDir: string,
): Promise<ParseResult> {
	const transactions: Transaction[] = [];
	const errors: ParseError[] = [];

	const folder = vault.getAbstractFileByPath(transactionsDir);
	if (!(folder instanceof TFolder)) {
		return { transactions, errors };
	}

	const files = folder.children.filter(
		(f): f is TFile => f instanceof TFile && f.extension === "md",
	);

	for (const file of files) {
		const content = await vault.cachedRead(file);
		const result = parse(content, file.path);

		for (const txn of result.transactions) {
			transactions.push(txn);
		}
		for (const err of result.errors) {
			err.sourceFile = file.path;
			errors.push(err);
		}
	}

	// Chronological order across all files
	transactions.sort((a, b) => a.date.localeCompare(b.date));

	return { transactions, errors };
}
