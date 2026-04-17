import { ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import type TareMoneyPlugin from "../main";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { BalancesView } from "./BalancesView";
import { IncomeExpensesView } from "./IncomeExpensesView";
import styles from "./TareMoneyView.module.css";
import { GlobalFilters } from "../components/GlobalFilters";
import { ParseErrorList } from "../components/ParseErrorList";
import ReactViewRootWrap from "../components/ReactViewRootWrap";
import { useAppContext } from "../hooks/useAppContext";

export const VIEW_TYPE_TARE_MONEY = "tare-money-view";

const TABS = [
	{ id: "balances" as const, label: "Balances" },
	{ id: "income-expenses" as const, label: "Income & Expenses" },
] as const;

export class TareMoneyView extends ItemView {
	private root: Root | null = null;
	private plugin: TareMoneyPlugin;
	private unsubscribe: (() => void) | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: TareMoneyPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_TARE_MONEY;
	}

	getDisplayText(): string {
		return "Tare money";
	}

	getIcon(): string {
		return "wallet";
	}

	async onOpen(): Promise<void> {
		this.root = createRoot(this.contentEl.createDiv());
		this.root.render(
			<ReactViewRootWrap plugin={this.plugin}>
				<TareMoneyViewComponent />
			</ReactViewRootWrap>,
		);
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.root?.unmount();
		this.root = null;
	}
}

function TareMoneyViewComponent() {
	const {
		userPreferences,
		transactionsLoading,
		updateUserPreferences,
		parseErrors,
		transactionsStale,
		reloadStaleData,
		openAddTransactionModal,
	} = useAppContext();

	if (transactionsLoading) {
		return <LoadingSpinner message="Loading…" />;
	}

	return (
		<>
			{transactionsStale && (
				<div
					className={"tare-stale-banner"}
					onClick={() => void reloadStaleData()}
				>
					<span>Change detected in transaction data files.</span>
					<button type={"button"}>Reload</button>
				</div>
			)}
			{parseErrors?.length > 0 && <ParseErrorList errors={parseErrors} />}
			<GlobalFilters />
			<div className={styles.tabs}>
				{TABS.map((tab) => (
					<button
						key={tab.id}
						className={`${styles.tab}${userPreferences.activeTab === tab.id ? ` ${styles.active}` : ""}`}
						onClick={() =>
							updateUserPreferences({ activeTab: tab.id })
						}
					>
						{tab.label}
					</button>
				))}
				<button
					className={`${styles.tab} ${styles.addBtn}`}
					onClick={openAddTransactionModal}
					aria-label="Add transaction"
				>
					+
				</button>
			</div>

			<div>
				{userPreferences.activeTab === "balances" ? (
					<BalancesView />
				) : (
					<IncomeExpensesView />
				)}
			</div>
		</>
	);
}
