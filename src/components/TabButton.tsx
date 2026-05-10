import { useEffect, useRef } from "react";
import { setIcon } from "obsidian";
import styles from "./TabButton.module.css";
import { useAppContext } from "../hooks/useAppContext";
import { ViewTab } from "../helpers/types";

export function TabButton({
	id,
	label,
	icon,
}: {
	id: ViewTab;
	label: string;
	icon: string;
}) {
	const ref = useRef<HTMLButtonElement>(null);
	const { userPreferences, updateUserPreferences } = useAppContext();

	useEffect(() => {
		if (ref.current) setIcon(ref.current, icon);
	}, [icon]);

	return (
		<button
			ref={ref}
			className={`${styles.tab}${userPreferences.activeTab === id ? ` ${styles.active}` : ""}`}
			onClick={() => {
				updateUserPreferences({ activeTab: id });
			}}
			aria-label={label}
		/>
	);
}
