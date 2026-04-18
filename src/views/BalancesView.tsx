import { useState, useCallback } from "react";
import DatePicker from "react-datepicker";
import { ACCOUNT_PREFIX, DEBOUNCE_MS } from "../helpers/constants";
import { useProcessedTransactions } from "../hooks/useProcessedTransactions";
import { AccountTreeTable } from "../components/AccountTreeTable";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { formatDate } from "../helpers/utils";
import { FilterWrap } from "../components/FilterWrap";
import { Transaction } from "../helpers/types";
import { useAppContext } from "../hooks/useAppContext";
import CustomDatePicker from "../components/CustomDatePicker";

export function BalancesView() {
	const { userPreferences, updateUserPreferences } = useAppContext();
	const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
	const debouncedDate = useDebouncedValue(selectedDate, DEBOUNCE_MS);

	const transactionsFilter = useCallback(
		(txn: Transaction) =>
			(!debouncedDate || txn.date <= formatDate(debouncedDate)) &&
			txn.entries.some((entry) =>
				entry.account.startsWith(ACCOUNT_PREFIX),
			),
		[debouncedDate],
	);

	const { balances } = useProcessedTransactions(transactionsFilter);

	const assetAccountBalances = new Map(
		[...balances.entries()].filter(
			([account, { currencies }]) =>
				account.startsWith(ACCOUNT_PREFIX) &&
				![...currencies.values()].some((v) => v < 0),
		),
	);
	const liabilityAccountBalances = new Map(
		[...balances.entries()].filter(
			([account, { currencies }]) =>
				account.startsWith(ACCOUNT_PREFIX) &&
				[...currencies.values()].some((v) => v < 0),
		),
	);

	return (
		<>
			<FilterWrap>
				<div className="tare-row">
					<span className="tare-label">As of</span>
					<CustomDatePicker
						selected={selectedDate}
						onChange={setSelectedDate}
					/>
				</div>
				<label className="tare-label tare-row tare-checkbox-wrap">
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
				accountBalances={assetAccountBalances}
				label="Assets"
				amountLabel="Balance"
				hideZeroBalances={userPreferences.hide_zero_balances}
			/>
			<div className="tare-separator" />
			<AccountTreeTable
				accountBalances={liabilityAccountBalances}
				label="Liabilities"
				amountLabel="Balance"
				hideZeroBalances={userPreferences.hide_zero_balances}
			/>
		</>
	);
}
