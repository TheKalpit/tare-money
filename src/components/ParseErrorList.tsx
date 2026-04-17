import type { ParseError } from "../helpers/types";
import styles from "./ParseErrorList.module.css";

const MAX_VISIBLE = 50;

interface ParseErrorListProps {
	errors: ParseError[];
}

export function ParseErrorList({ errors }: ParseErrorListProps) {
	const visible = errors.slice(0, MAX_VISIBLE);
	const remaining = errors.length - MAX_VISIBLE;

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				{errors.length} parse error{errors.length !== 1 && "s"}
			</div>
			<ul className={styles.list}>
				{visible.map((e, i) => (
					<li key={i} className={styles.item}>
						<span className={styles.location}>
							{e.sourceFile}:{e.lineNumber} —{" "}
							<span className={styles.message}>{e.message}</span>
						</span>
						{e.lineContent && (
							<span className={styles.content}>
								{e.lineContent.length > 80
									? e.lineContent.slice(0, 80) + "…"
									: e.lineContent}
							</span>
						)}
					</li>
				))}
			</ul>
			{remaining > 0 && <div>…and {remaining} more.</div>}
		</div>
	);
}
