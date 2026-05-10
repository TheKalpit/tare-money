import { ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import type TareMoneyPlugin from "../main";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { AddTransactionView } from "./AddTransactionView";
import { BalancesView } from "./BalancesView";
import { IncomeExpensesView } from "./IncomeExpensesView";
import styles from "./TareMoneyView.module.css";
import { GlobalFilters } from "../components/GlobalFilters";
import { ParseErrorList } from "../components/ParseErrorList";
import ReactViewRootWrap from "../components/ReactViewRootWrap";
import { TabButton } from "../components/TabButton";
import { useAppContext } from "../hooks/useAppContext";
import { ViewTab } from "../helpers/types";
import { FC } from "react";
import { TransactionListView } from "./TransactionListView";

export const VIEW_TYPE_TARE_MONEY = "tare-money-view";

const TABS: Record<ViewTab, { label: string; icon: string; view: FC }> = {
	"add-transaction": {
		label: "Add Transaction",
		icon: "plus",
		view: AddTransactionView,
	},
	balances: { label: "Balances", icon: "landmark", view: BalancesView },
	"income-expenses": {
		label: "Income & Expenses",
		icon: "trending-up-down",
		view: IncomeExpensesView,
	},
	"transaction-list": {
		label: "Transactions",
		icon: "notebook-text",
		view: TransactionListView,
	},
} as const;

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
		parseErrors,
		transactionsStale,
		reloadStaleData,
	} = useAppContext();

	if (transactionsLoading) {
		return <LoadingSpinner message="Loading…" />;
	}

	const ActiveView = TABS[userPreferences.activeTab].view;

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
				{Object.entries(TABS).map(([tabId, tab]) => (
					<TabButton
						key={tabId}
						id={tabId as ViewTab}
						label={tab.label}
						icon={tab.icon}
					/>
				))}
			</div>

			<div>
				<ActiveView />
			</div>
		</>
	);
}
