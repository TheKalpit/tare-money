import React, { useState, useCallback } from "react";
import DatePicker from "react-datepicker";
import { EntryFormRow } from "./EntryFormRow";
import styles from "./AddTransactionForm.module.css";
import {
	TransactionFormErrors,
	TransactionFormEntry,
	TransactionEntryFieldErrors,
	PartialTransactionEntry,
} from "../helpers/types";
import {
	validateTransaction,
	validateEntry,
	validateDate,
	validateDescription,
	validateAccount,
	validateAmount,
	validateCurrency,
} from "../helpers/validation";
import { extractTags, ValidationError } from "../helpers/utils";
import { useAppContext } from "../hooks/useAppContext";

export function AddTransactionForm({ closeModal }: { closeModal: () => void }) {
	const [date, setDate] = useState<Date | null>(new Date());
	const [description, setDescription] = useState("");
	const [entries, setEntries] = useState<TransactionFormEntry[]>([
		{ id: crypto.randomUUID(), account: "", amount: "", currency: "" },
		{ id: crypto.randomUUID(), account: "", amount: "", currency: "" },
	]);
	const [errors, setErrors] = useState<TransactionFormErrors>({
		entries: {},
	});
	const [saving, setSaving] = useState(false);
	const { saveTransactionToFile } = useAppContext();

	const updateEntry = (
		entryId: string,
		updates: Partial<TransactionFormEntry>,
	) => {
		setEntries((prev) =>
			prev.map((entry) =>
				entry.id === entryId ? { ...entry, ...updates } : entry,
			),
		);
	};

	const addEntry = () => {
		setEntries((prev) => [
			...prev,
			{ id: crypto.randomUUID(), account: "", amount: "", currency: "" },
		]);
	};

	const removeEntry = (entryId: string) => {
		setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
		setErrors((prev) => {
			const next = { ...prev, entries: { ...prev.entries } };
			delete next.entries[entryId];
			return next;
		});
	};

	// Date validates on change (DatePicker has no traditional blur)
	const handleDateChange = useCallback((d: Date | null) => {
		setDate(d);
		try {
			validateDate(d);
			setErrors((prev) => ({ ...prev, date: undefined }));
		} catch (e) {
			if (e instanceof ValidationError) {
				setErrors((prev) => ({ ...prev, date: e.message }));
			} else {
				throw e;
			}
		}
	}, []);

	// Description validates on blur
	const handleDescriptionBlur = useCallback(() => {
		try {
			validateDescription(description);
			setErrors((prev) => ({ ...prev, description: undefined }));
		} catch (e) {
			if (e instanceof ValidationError) {
				setErrors((prev) => ({ ...prev, description: e.message }));
			} else {
				throw e;
			}
		}
	}, [description]);

	// Submit: validate → build typed Transaction → save
	const handleSave = async () => {
		if (saving) return;

		const allErrors: TransactionFormErrors = {
			entries: {},
		};
		let validDate = "";
		let validDescription = "";

		// Validate date
		try {
			validDate = validateDate(date);
		} catch (e) {
			if (e instanceof ValidationError) {
				allErrors.date = e.message;
			} else {
				throw e;
			}
		}

		// Validate description
		try {
			validDescription = validateDescription(description);
		} catch (e) {
			if (e instanceof ValidationError) {
				allErrors.description = e.message;
			} else {
				throw e;
			}
		}

		// Validate each entry — validateEntry returns TransactionEntry or throws
		const validEntries: PartialTransactionEntry[] = [];
		entries.forEach((entry) => {
			let account: string;
			let primaryAmount: number | undefined;
			let primaryCurrency: string | undefined;
			let conversionAmount: number | undefined;
			let conversionCurrency: string | undefined;

			const entryError: TransactionEntryFieldErrors = {};

			try {
				account = validateAccount(entry.account);
			} catch (e) {
				if (e instanceof ValidationError) {
					entryError.account = e.message;
				} else {
					throw e;
				}
			}

			try {
				if (entry.amount) {
					primaryAmount = validateAmount(entry.amount);
				}
			} catch (e) {
				if (e instanceof ValidationError) {
					entryError.amount = e.message;
				} else {
					throw e;
				}
			}

			try {
				if (entry.currency) {
					primaryCurrency = validateCurrency(entry.currency);
				}
			} catch (e) {
				if (e instanceof ValidationError) {
					entryError.currency = e.message;
				} else {
					throw e;
				}
			}

			try {
				if (entry.conversionAmount) {
					conversionAmount = validateAmount(entry.conversionAmount);
				}
			} catch (e) {
				if (e instanceof ValidationError) {
					entryError.conversionAmount = e.message;
				} else {
					throw e;
				}
			}

			try {
				if (entry.conversionCurrency) {
					conversionCurrency = validateCurrency(
						entry.conversionCurrency,
					);
				}
			} catch (e) {
				if (e instanceof ValidationError) {
					entryError.conversionCurrency = e.message;
				} else {
					throw e;
				}
			}

			if (Object.keys(entryError).length > 0) {
				allErrors.entries[entry.id] = entryError;
				return;
			}

			try {
				validEntries.push(
					validateEntry(
						account!,
						primaryAmount,
						primaryAmount ? primaryCurrency : undefined,
						conversionAmount,
						conversionAmount ? conversionCurrency : undefined,
					),
				);
			} catch (e) {
				if (e instanceof ValidationError) {
					allErrors.entries[entry.id] = {
						nonFieldError: e.message,
					};
				} else {
					throw e;
				}
			}
		});

		if (
			Object.keys(allErrors.entries).length > 0 ||
			allErrors.date ||
			allErrors.description ||
			allErrors.nonFieldError
		) {
			setErrors(allErrors);
			return;
		}

		try {
			const transaction = validateTransaction(
				validDate,
				validDescription,
				validEntries,
				extractTags(description),
			);

			setSaving(true);
			await saveTransactionToFile(transaction);
			setErrors({ entries: {} });
			closeModal();
		} catch (e) {
			if (e instanceof ValidationError) {
				setErrors({
					entries: {},
					nonFieldError: e.message,
				});
			} else {
				throw e;
			}
		} finally {
			setSaving(false);
		}
	};

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void handleSave();
			}}
			className={styles.wrap}
		>
			<div>
				<div className={styles.row}>
					<DatePicker
						selected={date}
						onChange={handleDateChange}
						dateFormat="yyyy-MM-dd"
						wrapperClassName={styles.dateInput}
						className={`tare-input${errors.date ? " invalid" : ""}`}
						placeholderText="YYYY-MM-DD"
						popperProps={{ strategy: "fixed" }}
						todayButton="Today"
					/>
					<input
						className={`tare-input ${styles.descriptionInput}${errors.description ? " invalid" : ""}`}
						placeholder="Description: e.g. Bought #grocery at Supermart"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						onBlur={handleDescriptionBlur}
					/>
				</div>
				{(!!errors.date || !!errors.description) && (
					<ul className="tare-field-errors">
						{errors.date && <li>{errors.date}</li>}
						{errors.description && <li>{errors.description}</li>}
					</ul>
				)}
			</div>

			<div className={styles.entries}>
				{entries.map((entry) => (
					<EntryFormRow
						key={entry.id}
						entry={entry}
						errors={errors.entries[entry.id]}
						canRemove={entries.length > 2}
						onChange={(updates) => updateEntry(entry.id, updates)}
						onError={(entryErrors) =>
							setErrors((prev) => ({
								...prev,
								entries: {
									...prev.entries,
									[entry.id]: {
										...prev.entries[entry.id],
										...entryErrors,
									},
								},
							}))
						}
						onRemove={() => removeEntry(entry.id)}
					/>
				))}
			</div>

			{!!errors.nonFieldError && (
				<div className="tare-field-errors">{errors.nonFieldError}</div>
			)}

			<div className={styles.footer}>
				<button
					type="button"
					className="tare-button"
					onClick={addEntry}
				>
					+ Add entry
				</button>
				<button
					type="submit"
					className="tare-button primary"
					disabled={saving}
				>
					{saving ? "Saving…" : "Save"}
				</button>
			</div>
		</form>
	);
}
