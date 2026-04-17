import { useMemo } from "react";
import type { AccountBalance, Transaction } from "../helpers/types";
import { useAppContext } from "./useAppContext";
import { useDebouncedValue } from "./useDebouncedValue";
import { DEBOUNCE_MS } from "../helpers/constants";

/**
 * Filters transactions and accumulates per-account, per-currency balances in a single pass.
 *
 * Applies two filters:
 * - `additionalFilters` — caller-provided (e.g. date range, account prefix)
 * - global search query from user preferences (debounced, matched against description)
 *
 * Returns both the filtered transaction list and a Map of account → currency balances.
 * Balances are rounded to 2 decimal places to avoid floating point noise.
 */
export function useProcessedTransactions(
	additionalFilters?: (txn: Transaction) => boolean,
): { transactions: Transaction[]; balances: Map<string, AccountBalance> } {
	const { transactions, searchQuery } = useAppContext();
	const debouncedSearch = useDebouncedValue(
		searchQuery,
		DEBOUNCE_MS,
	).toLowerCase();

	return useMemo(() => {
		const balances = new Map<string, AccountBalance>();
		return {
			transactions: transactions.filter((txn) => {
				if (
					(!additionalFilters || additionalFilters(txn)) &&
					(!debouncedSearch ||
						txn.description.toLowerCase().includes(debouncedSearch))
				) {
					// Accumulate each entry's amount into the account's currency balance
					txn.entries.forEach((entry) => {
						const existing = balances.get(entry.account) ?? {
							currencies: new Map<string, number>(),
						};
						const sum =
							(existing.currencies.get(entry.currency) ?? 0) +
							entry.amount;
						existing.currencies.set(
							entry.currency,
							Math.round(sum * 100) / 100,
						);
						balances.set(entry.account, existing);
					});
					return true;
				}
				return false;
			}),
			balances,
		};
	}, [transactions, additionalFilters, debouncedSearch]);
}
