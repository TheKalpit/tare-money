import React, { useCallback } from "react";
import styles from "./EntryRow.module.css";
import { useAppContext } from "../hooks/useAppContext";
import { AccountCombobox } from "./AccountCombobox";
import {
	TransactionEntryFieldErrors,
	TransactionFormEntry,
} from "../helpers/types";
import {
	validateAccount,
	validateAmount,
	validateCurrency,
} from "../helpers/validation";
import { ValidationError } from "../helpers/utils";

interface EntryRowProps {
	entry: TransactionFormEntry;
	canRemove: boolean;
	errors?: TransactionEntryFieldErrors;
	onChange: (updates: Partial<TransactionFormEntry>) => void;
	onError: (errors: TransactionEntryFieldErrors) => void;
	onRemove: () => void;
}

export function EntryFormRow({
	entry,
	onChange,
	errors,
	onError,
	canRemove,
	onRemove,
}: EntryRowProps) {
	const { accounts } = useAppContext();

	const handleAccountBlur = useCallback(() => {
		try {
			validateAccount(entry.account);
			onError({ account: undefined });

			// Auto-fill currency from known account
			const currency = accounts.get(entry.account);
			if (currency && !entry.currency) {
				onChange({ currency: currency });
			}
		} catch (e) {
			if (e instanceof ValidationError) {
				onError({ account: e.message });
			} else {
				throw e;
			}
		}
	}, [entry.account, entry.currency, accounts, onChange, onError]);

	const amountOnBlur = useCallback(() => {
		try {
			if (entry.amount) {
				validateAmount(entry.amount);
			}
			onError({ amount: undefined });
		} catch (e) {
			if (e instanceof ValidationError) {
				onError({ amount: e.message });
			} else {
				throw e;
			}
		}
	}, [entry.amount, onError]);

	const currencyOnBlur = useCallback(() => {
		try {
			if (entry.currency) {
				validateCurrency(entry.currency);
			}
			onError({ currency: undefined });
		} catch (e) {
			if (e instanceof ValidationError) {
				onError({ currency: e.message });
			} else {
				throw e;
			}
		}
	}, [entry.currency, onError]);

	const convAmountOnBlur = useCallback(() => {
		try {
			if (entry.conversionAmount) {
				validateAmount(entry.conversionAmount);
			}
			onError({ conversionAmount: undefined });
		} catch (e) {
			if (e instanceof ValidationError) {
				onError({ conversionAmount: e.message });
			} else {
				throw e;
			}
		}
	}, [entry.conversionAmount, onError]);

	const convCurrencyOnBlur = useCallback(() => {
		try {
			if (entry.conversionCurrency) {
				validateCurrency(entry.conversionCurrency);
			}
			onError({ conversionCurrency: undefined });
		} catch (e) {
			if (e instanceof ValidationError) {
				onError({ conversionCurrency: e.message });
			} else {
				throw e;
			}
		}
	}, [entry.conversionCurrency, onError]);

	const hasError =
		!!errors?.account ||
		!!errors?.amount ||
		!!errors?.currency ||
		!!errors?.conversionAmount ||
		!!errors?.conversionCurrency ||
		!!errors?.nonFieldError;

	return (
		<div>
			<div className={styles.entry}>
				<AccountCombobox
					value={entry.account}
					hasError={!!errors?.account}
					onValueChange={(value) => onChange({ account: value })}
					onBlur={handleAccountBlur}
				/>

				<div className={styles.amountGroup}>
					<input
						className={`tare-input ${styles.amount}${errors?.amount ? " invalid" : ""}`}
						placeholder="amount"
						inputMode="decimal"
						value={entry.amount ?? ""}
						onChange={(e) => onChange({ amount: e.target.value })}
						onBlur={amountOnBlur}
					/>
					<input
						className={`tare-input ${styles.currency}${errors?.currency ? " invalid" : ""}`}
						placeholder="CUR"
						value={entry.currency ?? ""}
						onChange={(e) =>
							onChange({
								currency: e.target.value?.toUpperCase(),
							})
						}
						onBlur={currencyOnBlur}
					/>
				</div>

				<span className={styles.at}>@@</span>

				<div className={styles.amountGroup}>
					<input
						className={`tare-input ${styles.amount}${errors?.conversionAmount ? " invalid" : ""}`}
						placeholder="amount"
						inputMode="decimal"
						value={entry.conversionAmount ?? ""}
						onChange={(e) =>
							onChange({ conversionAmount: e.target.value })
						}
						onBlur={convAmountOnBlur}
					/>
					<input
						className={`tare-input ${styles.currency}${errors?.conversionCurrency ? " invalid" : ""}`}
						placeholder="CUR"
						value={entry.conversionCurrency ?? ""}
						onChange={(e) =>
							onChange({
								conversionCurrency:
									e.target.value?.toUpperCase(),
							})
						}
						onBlur={convCurrencyOnBlur}
					/>
				</div>

				{canRemove && (
					<button
						className={`tare-button ${styles.remove}`}
						onClick={onRemove}
					>
						×
					</button>
				)}
			</div>
			{hasError && (
				<ul className={"tare-field-errors"}>
					{errors?.account && <li>{errors.account}</li>}
					{errors?.amount && <li>{errors.amount}</li>}
					{errors?.currency && <li>{errors.currency}</li>}
					{errors?.conversionAmount && (
						<li>{errors.conversionAmount}</li>
					)}
					{errors?.conversionCurrency && (
						<li>{errors.conversionCurrency}</li>
					)}
					{errors?.nonFieldError && <li>{errors.nonFieldError}</li>}
				</ul>
			)}
		</div>
	);
}
