import { useAppContext } from "../hooks/useAppContext";
import { Transaction } from "../helpers/types";
import styles from "./TransactionItem.module.css";

const fmt = (amount: number, locale: string) =>
	amount.toLocaleString(locale, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

export function TransactionItem({ transaction }: { transaction: Transaction }) {
	const {
		appSettings: { numberLocale },
	} = useAppContext();

	return (
		<div className={styles.item}>
			<div className={styles.header}>
				<span className={styles.date}>{transaction.date}</span>
				<span>{transaction.description}</span>
			</div>
			<div className={styles.entries}>
				{transaction.entries.map((entry, i) => (
					<div className={styles.entry} key={i}>
						<span className={styles.account}>{entry.account}</span>
						<span className={styles.amount}>
							{fmt(entry.amount, numberLocale)} {entry.currency}
							{entry.conversion && (
								<>
									{" @@ "}
									{fmt(
										entry.conversion.amount,
										numberLocale,
									)}{" "}
									{entry.conversion.currency}
								</>
							)}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
