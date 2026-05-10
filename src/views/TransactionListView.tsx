import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
	let current = el?.parentElement ?? null;
	while (current) {
		const { overflowY } = getComputedStyle(current);
		if (overflowY === "auto" || overflowY === "scroll") {
			return current;
		}
		current = current.parentElement;
	}
	return null;
}

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

	const listRef = useRef<HTMLDivElement>(null);
	const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
	const [listOffset, setListOffset] = useState(0);

	useLayoutEffect(() => {
		const el = listRef.current;
		if (!el) return;
		const sp = findScrollParent(el);
		if (!sp) return;
		setScrollEl(sp);
		setListOffset(
			el.getBoundingClientRect().top -
				sp.getBoundingClientRect().top +
				sp.scrollTop,
		);
	}, []);

	const virtualizer = useVirtualizer({
		count: transactions.length,
		getScrollElement: () => scrollEl,
		estimateSize: () => 80,
		overscan: 5,
		scrollMargin: listOffset,
	});

	const items = virtualizer.getVirtualItems();

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
			<div ref={listRef} className={styles.list}>
				{transactions.length === 0 ? (
					<div className="no-data-message">No data.</div>
				) : (
					<div
						style={{
							height: `${virtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative",
						}}
					>
						<div
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								transform: `translateY(${(items[0]?.start ?? 0) - listOffset}px)`,
							}}
						>
							{items.map((vi) => {
								const txn = transactions[vi.index];
								if (!txn) return null;
								return (
									<div
										key={vi.key}
										data-index={vi.index}
										ref={virtualizer.measureElement}
									>
										<TransactionItem transaction={txn} />
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</>
	);
}
