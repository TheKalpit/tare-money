import React from "react";
import styles from "./FilterWrap.module.css";

interface FilterWrapProps {
	children: React.ReactNode;
}

export function FilterWrap({ children }: FilterWrapProps) {
	return <div className={styles.filters}>{children}</div>;
}
