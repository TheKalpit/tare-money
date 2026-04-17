import { useRef, useEffect } from "react";
import { setIcon } from "obsidian";
import styles from "./LoadingSpinner.module.css";

interface LoadingSpinnerProps {
	message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
	const iconRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (iconRef.current) {
			setIcon(iconRef.current, "loader");
		}
	}, []);

	return (
		<div className={styles.loading}>
			<div ref={iconRef} className={styles.spinner} />
			{message && <p>{message}</p>}
		</div>
	);
}
