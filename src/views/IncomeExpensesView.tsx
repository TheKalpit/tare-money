import { useMemo, useCallback } from "react";
import DatePicker from "react-datepicker";
import { CATEGORY_PREFIX, DEBOUNCE_MS } from "../helpers/constants";
import { useProcessedTransactions } from "../hooks/useProcessedTransactions";
import { formatDate, parseDateString } from "../helpers/utils";
import { AccountTreeTable } from "../components/AccountTreeTable";
import { useAppContext } from "../hooks/useAppContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { Transaction } from "../helpers/types";
import { FilterWrap } from "../components/FilterWrap";

export function IncomeExpensesView() {
	const { userPreferences, updateUserPreferences } = useAppContext();
	const debouncedFrom = useDebouncedValue(
		userPreferences.dateFrom,
		DEBOUNCE_MS,
	);
	const debouncedTo = useDebouncedValue(userPreferences.dateTo, DEBOUNCE_MS);
	const dateFrom = useMemo(
		() => parseDateString(userPreferences.dateFrom),
		[userPreferences.dateFrom],
	);
	const dateTo = useMemo(
		() => parseDateString(userPreferences.dateTo),
		[userPreferences.dateTo],
	);

	const dateFilter = useCallback(
		(txn: Transaction) =>
			(!debouncedFrom || txn.date >= debouncedFrom) &&
			(!debouncedTo || txn.date <= debouncedTo) &&
			txn.entries.some((entry) =>
				entry.account.startsWith(CATEGORY_PREFIX),
			),
		[debouncedFrom, debouncedTo],
	);

	const { balances } = useProcessedTransactions(dateFilter);
	const incomeBalances = new Map(
		[...balances.entries()].filter(
			([account, { currencies }]) =>
				account.startsWith(CATEGORY_PREFIX) &&
				[...currencies.values()].some((v) => v < 0),
		),
	);
	const expenseBalances = new Map(
		[...balances.entries()].filter(
			([account, { currencies }]) =>
				account.startsWith(CATEGORY_PREFIX) &&
				![...currencies.values()].some((v) => v < 0),
		),
	);

	return (
		<>
			<FilterWrap>
				<div className="tare-field-group">
					<span className="tare-label">Date range</span>
					<DatePicker
						selected={dateFrom}
						onChange={(d: Date | null) =>
							updateUserPreferences({ dateFrom: formatDate(d) })
						}
						dateFormat="yyyy-MM-dd"
						placeholderText="From"
						popperProps={{ strategy: "fixed" }}
						todayButton="Today"
					/>
					<span className="tare-label">—</span>
					<DatePicker
						selected={dateTo}
						onChange={(d: Date | null) =>
							updateUserPreferences({ dateTo: formatDate(d) })
						}
						dateFormat="yyyy-MM-dd"
						placeholderText="To"
						popperProps={{ strategy: "fixed" }}
						todayButton="Today"
					/>
				</div>
				<label className="tare-label tare-field-group">
					<input
						type="checkbox"
						checked={userPreferences.hide_zero_balances}
						onChange={(e) =>
							updateUserPreferences({
								hide_zero_balances: e.target.checked,
							})
						}
					/>
					Hide zero balances
				</label>
			</FilterWrap>
			<AccountTreeTable
				accountBalances={incomeBalances}
				label="Income"
				amountLabel="Amount"
				showAbsolute
				hideZeroBalances={userPreferences.hide_zero_balances}
			/>
			<div className="tare-separator" />
			<AccountTreeTable
				accountBalances={expenseBalances}
				label="Expenses"
				amountLabel="Amount"
				showAbsolute
				hideZeroBalances={userPreferences.hide_zero_balances}
			/>
		</>
	);
}
