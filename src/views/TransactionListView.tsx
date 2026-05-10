import { useCallback, useMemo } from "react";
import { DEBOUNCE_MS } from "../helpers/constants";
import { useProcessedTransactions } from "../hooks/useProcessedTransactions";
import { formatDate, parseDateString } from "../helpers/utils";
import { useAppContext } from "../hooks/useAppContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { Transaction } from "../helpers/types";
import { FilterWrap } from "../components/FilterWrap";
import { TransactionItem } from "../components/TransactionItem";
import styles from "./TransactionListView.module.css";
import CustomDatePicker from "../components/CustomDatePicker";

export function TransactionListView() {
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
			(!debouncedTo || txn.date <= debouncedTo),
		[debouncedFrom, debouncedTo],
	);

	const { transactions } = useProcessedTransactions(dateFilter);

	return (
		<>
			<FilterWrap>
				<div className="tare-row">
					<span className="tare-label">Date range</span>
					<CustomDatePicker
						selected={dateFrom}
						startDate={dateFrom}
						endDate={dateTo}
						onChange={([dStart, dEnd]: [
							Date | null,
							Date | null,
						]) =>
							updateUserPreferences({
								dateFrom: formatDate(dStart),
								dateTo: formatDate(dEnd),
							})
						}
						className="date-range-input"
						wrapperClassName={styles.dateRangeWrap}
						selectsRange={true}
					/>
				</div>
			</FilterWrap>
			<div className={styles.list}>
				{transactions.length === 0 ? (
					<div className="no-data-message">No data.</div>
				) : (
					transactions.map((txn, i) => (
						<TransactionItem
							key={`${txn.date}-${i}`}
							transaction={txn}
						/>
					))
				)}
			</div>
		</>
	);
}
