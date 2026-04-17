import { useState, useMemo } from "react";
import { useAppContext } from "../hooks/useAppContext";
import styles from "./AccountTreeTable.module.css";
import type { AccountBalance } from "../helpers/types";
import {
	ACCOUNT_PREFIX,
	ACCOUNT_SEPARATOR,
	CATEGORY_PREFIX,
} from "../helpers/constants";

interface TreeNode {
	own: Record<string, number>;
	subtotals: Record<string, number>;
	children: Record<string, TreeNode>;
}

interface Row {
	id: string;
	segment: string;
	displayed: Record<string, number>;
	ancestorLines: boolean[];
	isLast: boolean;
	isTopLevel: boolean;
	hasChildren: boolean;
	isOpen: boolean;
}

interface AccountTreeTableProps {
	accountBalances: Map<string, AccountBalance>;
	label: string;
	amountLabel: string;
	showAbsolute?: boolean;
	hideZeroBalances?: boolean;
}

function isZero(balances: Record<string, number>): boolean {
	return Object.values(balances).every((v) => v === 0);
}

function formatBalances(
	balances: Record<string, number>,
	showAbsolute: boolean,
	locale: string,
) {
	return Object.entries(balances).map(([currency, amount]) => {
		const value = showAbsolute ? Math.abs(amount) : amount;
		return (
			<div key={currency}>
				{value.toLocaleString(locale, {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})}{" "}
				{currency}
			</div>
		);
	});
}

// Top-level prefixes (Accounts, Categories) are not rendered as rows — their totals appear in the footer
const SKIP_SEGMENTS = new Set([
	ACCOUNT_PREFIX.replace(ACCOUNT_SEPARATOR, ""),
	CATEGORY_PREFIX.replace(ACCOUNT_SEPARATOR, ""),
]);

export function AccountTreeTable({
	accountBalances,
	label,
	amountLabel,
	showAbsolute = false,
	hideZeroBalances = false,
}: AccountTreeTableProps) {
	const {
		appSettings: { numberLocale },
	} = useAppContext();

	const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

	const treeData = useMemo(() => {
		const root: TreeNode = { own: {}, subtotals: {}, children: {} };

		accountBalances.forEach((balance, account) => {
			let current = root;
			account.split(ACCOUNT_SEPARATOR).forEach((segment) => {
				if (SKIP_SEGMENTS.has(segment)) return;
				if (!current.children[segment]) {
					current.children[segment] = {
						own: {},
						subtotals: {},
						children: {},
					};
				}
				current = current.children[segment]!;
			});
			balance.currencies.forEach((amount, currency) => {
				current.own[currency] = (current.own[currency] ?? 0) + amount;
			});
		});

		function finalize(node: TreeNode): Record<string, number> {
			node.subtotals = { ...node.own };
			const sorted = Object.entries(node.children).sort(([a], [b]) =>
				a.localeCompare(b),
			);
			node.children = {};
			sorted.forEach(([k, v]) => {
				const sub = finalize(v);
				if (hideZeroBalances && isZero(sub)) return;
				node.children[k] = v;
				Object.entries(sub).forEach(([currency, amount]) => {
					node.subtotals[currency] =
						(node.subtotals[currency] ?? 0) + amount;
				});
			});
			return node.subtotals;
		}

		finalize(root);
		return {
			total: root.subtotals,
			entries: Object.entries(root.children),
		};
	}, [accountBalances, hideZeroBalances]);

	const rows = useMemo(() => {
		const out: Row[] = [];
		function walk(
			children: [string, TreeNode][],
			parentPath: string,
			ancestorLines: boolean[],
			isTopLevel: boolean,
		) {
			children.forEach(([segment, node], i) => {
				const id = parentPath ? `${parentPath}/${segment}` : segment;
				const isLast = i === children.length - 1;
				const hasChildren = Object.keys(node.children).length > 0;
				const isOpen = !collapsed.has(id);
				const displayed =
					!isOpen && hasChildren ? node.subtotals : node.own;
				out.push({
					id,
					segment,
					displayed,
					ancestorLines,
					isLast,
					isTopLevel,
					hasChildren,
					isOpen,
				});
				if (isOpen && hasChildren) {
					walk(
						Object.entries(node.children),
						id,
						// Top-level rows don't propagate a vertical line into their children
						isTopLevel ? [] : [...ancestorLines, !isLast],
						false,
					);
				}
			});
		}
		walk(treeData.entries, "", [], true);
		return out;
	}, [treeData, collapsed]);

	const toggle = (id: string) => {
		setCollapsed((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	return (
		<table className={styles.table}>
			<thead>
				<tr>
					<th>{label}</th>
					<th className={styles.amountCell}>{amountLabel}</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr
						key={row.id}
						className={row.hasChildren ? styles.parent : undefined}
						onClick={
							row.hasChildren ? () => toggle(row.id) : undefined
						}
					>
						<td>
							<span className={styles.treeCell}>
								{row.ancestorLines.map((hasContinuation, i) => (
									<span
										key={i}
										className={`${styles.connector} ${hasContinuation ? styles.connectorLine : ""}`}
									/>
								))}
								{!row.isTopLevel && (
									<span
										className={`${styles.connector} ${styles.branch} ${row.isLast ? styles.branchLast : styles.branchMid}`}
									/>
								)}
								{row.hasChildren && row.isOpen && (
									<span className={styles.childLink} />
								)}
								<span className={styles.name}>
									{row.segment}
								</span>
								{row.hasChildren && !row.isOpen && (
									<span className={styles.collapsed}>
										···
									</span>
								)}
							</span>
						</td>
						<td className={styles.amountCell}>
							{formatBalances(
								row.displayed,
								showAbsolute,
								numberLocale,
							)}
						</td>
					</tr>
				))}
				{rows.length === 0 && (
					<tr>
						<td colSpan={2} className={styles.empty}>
							No data.
						</td>
					</tr>
				)}
			</tbody>
			{rows.length > 0 && (
				<tfoot>
					<tr className={styles.totalRow}>
						<td>Total</td>
						<td className={styles.amountCell}>
							{formatBalances(
								treeData.total,
								showAbsolute,
								numberLocale,
							)}
						</td>
					</tr>
				</tfoot>
			)}
		</table>
	);
}
