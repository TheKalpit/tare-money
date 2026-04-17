import { useAppContext } from "../hooks/useAppContext";
import styles from "./GlobalFilters.module.css";

export function GlobalFilters() {
	const { searchQuery, updateSearchQuery } = useAppContext();

	return (
		<div className={styles.wrap}>
			<input
				type="text"
				className={`tare-input ${styles.searchInput}`}
				placeholder="Filter by description or #tag"
				value={searchQuery}
				onChange={(e) => updateSearchQuery(e.target.value)}
			/>
		</div>
	);
}
