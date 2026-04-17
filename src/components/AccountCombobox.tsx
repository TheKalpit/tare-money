import React, { useState, useMemo } from "react";
import { useCombobox } from "downshift";
import { useAppContext } from "../hooks/useAppContext";
import styles from "./AccountCombobox.module.css";
import { ACCOUNT_PREFIX, CATEGORY_PREFIX } from "../helpers/constants";

interface AccountComboboxProps {
	value: string;
	placeholder?: string;
	hasError?: boolean;
	onValueChange: (value: string) => void;
	/** Called when user selects an account from the dropdown (not on free typing). */
	onSelect?: (account: string) => void;
	onBlur?: () => void;
}

/**
 * Combobox for account names. Supports free text input — user can type any value.
 * Suggestions are filtered from the accounts list (via AppContext) using case-insensitive includes matching.
 */
export function AccountCombobox({
	value,
	placeholder = `${ACCOUNT_PREFIX} or ${CATEGORY_PREFIX}`,
	hasError = false,
	onValueChange,
	onBlur,
	onSelect,
}: AccountComboboxProps) {
	const { accounts } = useAppContext();
	const [inputValue, setInputValue] = useState(value);

	const accountNames = useMemo(() => [...accounts.keys()], [accounts]);

	const filteredItems = useMemo(() => {
		if (!inputValue) return accountNames.slice(0, 10);
		const query = inputValue.toLowerCase();
		return accountNames
			.filter((a) => a.toLowerCase().includes(query))
			.slice(0, 10);
	}, [inputValue, accountNames]);

	const {
		isOpen,
		getMenuProps,
		getInputProps,
		getItemProps,
		highlightedIndex,
	} = useCombobox({
		items: filteredItems,
		inputValue,
		onInputValueChange: ({ inputValue: newValue }) => {
			const val = newValue ?? "";
			setInputValue(val);
			onValueChange(val);
		},
		onSelectedItemChange: ({ selectedItem }) => {
			if (selectedItem) {
				onValueChange(selectedItem);
				onSelect?.(selectedItem);
			}
		},
		itemToString: (item) => item ?? "",
	});

	return (
		<div className={styles.wrap}>
			<input
				{...getInputProps({ onBlur })}
				className={`tare-input ${hasError ? ` invalid` : ""}`}
				placeholder={placeholder}
			/>
			<ul {...getMenuProps()} className={styles.menu}>
				{isOpen &&
					filteredItems.map((item, index) => (
						<li
							key={item}
							{...getItemProps({ item, index })}
							className={`${styles.item}${highlightedIndex === index ? ` ${styles.highlighted}` : ""}`}
						>
							{item}
						</li>
					))}
			</ul>
		</div>
	);
}
