import { normalizePath, Notice, Plugin, TFolder } from "obsidian";
import { TareMoneySettingTab } from "./helpers/settings";
import { TareMoneyView, VIEW_TYPE_TARE_MONEY } from "./views/TareMoneyView";
import { AddTransactionModal } from "./modals/AddTransactionModal";
import {
	Transaction,
	ParseError,
	AppContextData,
	TareMoneySettings,
	UserPreferences,
} from "./helpers/types";
import { loadTransactions } from "./core/transactions";
import "./styles.css";
import {
	getDefaultSettings,
	getDefaultUserPreferences,
	ValidationError,
} from "./helpers/utils";

/**
 * Main plugin class. Owns all application state and exposes it to React views
 * via useSyncExternalStore (subscribe/getAppContextData).
 *
 * State flows one way: Plugin → React. React calls actions (updateUserPreferences,
 * reloadStaleData, etc.) to trigger changes, but never mutates state directly.
 */
export default class TareMoneyPlugin extends Plugin {
	// --- Private state ---

	private ribbonIcon: HTMLElement | null = null;
	private listeners = new Set<() => void>();
	private savedSettings: Partial<TareMoneySettings> = {};

	// --- Plugin lifecycle ---

	async onload() {
		await this.loadSyncedConfigData();

		this.registerView(
			VIEW_TYPE_TARE_MONEY,
			(leaf) => new TareMoneyView(leaf, this),
		);

		this.ribbonIcon = this.addRibbonIcon("wallet", "Tare money", () => {
			void this.openMainView();
		});

		this.addCommand({
			id: "open-view",
			name: "Open view",
			callback: () => void this.openMainView(),
		});

		this.addCommand({
			id: "add-transaction",
			name: "Add transaction",
			callback: () => void this.openAddTransactionModal(),
		});

		this.addSettingTab(
			new TareMoneySettingTab(
				this.app,
				this,
				{ ...this.savedSettings },
				this.saveSettings,
			),
		);

		// Defer data loading + file watchers until vault is fully indexed
		this.app.workspace.onLayoutReady(() => {
			this.loadTransactionData();
			this.registerFileWatchers();
		});
	}

	/** Called by Obsidian when data.json is modified externally (e.g. Obsidian Sync). */
	async onExternalSettingsChange() {
		this.setStale(true);
	}

	// --- External store API (useSyncExternalStore) ---

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	getAppContextData = (): AppContextData => this.appContextData;

	/** Notifies all React subscribers that appContextData has changed. */
	private notify(): void {
		this.listeners.forEach((l) => l());
	}

	// --- Actions (exposed to React via appContextData) ---

	private saveUserPreferences = (preferences: Partial<UserPreferences>) => {
		this.appContextData = {
			...this.appContextData,
			userPreferences: {
				...this.appContextData.userPreferences,
				...preferences,
			},
		};
		this.notify();
		// Fire-and-forget persist to data.json
		void this.loadData().then((raw) => {
			const existing = (raw as object | null) ?? {};
			void this.saveData({
				...existing,
				user_preferences: this.appContextData.userPreferences,
			});
		});
	};

	private updateSearchQuery = (query: string) => {
		this.appContextData = {
			...this.appContextData,
			searchQuery: query,
		};
		this.notify();
	};

	private reloadStaleData = async () => {
		await this.loadSyncedConfigData();
		this.loadTransactionData();
	};

	private openAddTransactionModal = () => {
		new AddTransactionModal(this).open();
	};

	// --- Internal helpers ---

	private loadTransactionData = () => {
		this.onTransactionsLoadingStarted();
		loadTransactions(
			this.app.vault,
			this.appContextData.appSettings.transactionsDir,
		)
			.then((result) => {
				this.onTransactionsLoadingSuccess(
					result.transactions,
					result.errors,
				);
			})
			.catch((e) => {
				const msg = e instanceof Error ? e.message : String(e);
				this.onTransactionsLoadingFail([
					`Failed to load transactions: ${msg}`,
				]);
			});
	};

	private setStale(stale: boolean): void {
		this.appContextData = {
			...this.appContextData,
			transactionsStale: stale,
		};
		this.ribbonIcon?.toggleClass("tare-money-icon-stale", stale);
		this.notify();
	}

	private onTransactionsLoadingStarted(): void {
		this.appContextData = {
			...this.appContextData,
			transactionsLoading: true,
			errors: [],
			parseErrors: [],
		};
		this.notify();
	}

	private onTransactionsLoadingSuccess(
		transactions: Transaction[],
		parseErrors: ParseError[],
	): void {
		this.appContextData = {
			...this.appContextData,
			transactions,
			transactionsLoading: false,
			accounts: this.collectAccounts(transactions),
			parseErrors,
		};
		// setStale(false) calls notify(), no need to call it again here
		this.setStale(false);
	}

	private onTransactionsLoadingFail(errors: string[]): void {
		this.appContextData = {
			...this.appContextData,
			transactionsLoading: false,
			errors,
		};
		this.notify();
	}

	/** Maps each account to its most recent currency. Most recently used accounts first. */
	private collectAccounts(transactions: Transaction[]): Map<string, string> {
		const map = new Map<string, string>();
		transactions.forEach((txn) => {
			txn.entries.forEach((entry) => {
				if (entry.currency) {
					map.delete(entry.account);
					map.set(entry.account, entry.currency);
				}
			});
		});
		return new Map([...map.entries()].reverse());
	}

	private registerFileWatchers(): void {
		const isMatch = (p: string) => {
			const prefix =
				this.appContextData.appSettings.transactionsDir + "/";
			return p.startsWith(prefix) && p.endsWith(".md");
		};

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (isMatch(file.path)) this.setStale(true);
			}),
		);
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (isMatch(file.path)) this.setStale(true);
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (isMatch(file.path)) this.setStale(true);
			}),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (isMatch(file.path) || isMatch(oldPath)) this.setStale(true);
			}),
		);
	}

	// --- Settings persistence ---

	/** Loads settings + user preferences from data.json, merging with defaults. */
	private async loadSyncedConfigData() {
		const saved = (await this.loadData()) as {
			settings?: Partial<TareMoneySettings>;
			user_preferences?: Partial<UserPreferences>;
		} | null;

		this.savedSettings = saved?.settings ?? {};

		this.appContextData = {
			...this.appContextData,
			appSettings: {
				...getDefaultSettings(),
				...saved?.settings,
			},
			userPreferences: {
				...getDefaultUserPreferences(),
				...saved?.user_preferences,
			},
		};
	}

	/** Saves only explicit user overrides (not defaults) to data.json. */
	private saveSettings = (settings: Partial<TareMoneySettings>) => {
		this.savedSettings = settings;
		this.appContextData = {
			...this.appContextData,
			appSettings: {
				...this.appContextData.appSettings,
				...this.savedSettings,
			},
		};
		this.notify();
		// Fire-and-forget persist to data.json
		void this.loadData().then((raw) => {
			const existing = (raw as object | null) ?? {};
			void this.saveData({
				...existing,
				settings: this.savedSettings,
			});
		});
	};

	// --- View helpers ---

	async openMainView() {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_TARE_MONEY);

		let leaf = leaves[0];
		if (!leaf) {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({
				type: VIEW_TYPE_TARE_MONEY,
				active: true,
			});
		}

		void workspace.revealLeaf(leaf);
		void this.reloadStaleData();
	}

	/** Receives a validated Transaction — formats to text and writes to file. */
	private readonly saveTransactionToFile = async (
		txn: Transaction,
	): Promise<void> => {
		const text = this.formatTransaction(txn);

		// Get file path
		const dir = this.appContextData.appSettings.transactionsDir;
		const year = txn.date.substring(0, 4);
		const filePath = normalizePath(`${dir}/${year}.md`);

		// Check if file exists, if not create it
		const existingFile = this.app.vault.getFileByPath(filePath);
		if (!existingFile) {
			const folder = this.app.vault.getAbstractFileByPath(dir);
			if (!folder) {
				await this.app.vault.createFolder(dir);
			} else if (!(folder instanceof TFolder)) {
				throw new ValidationError(`${dir} exists but is not a folder`);
			}

			// create file and add transaction to it
			await this.app.vault.create(filePath, text + "\n");
		} else {
			// append transaction to existing file
			await this.app.vault.process(existingFile, (content) => {
				const separator =
					content.length > 0 && !content.endsWith("\n\n")
						? content.endsWith("\n")
							? "\n"
							: "\n\n"
						: "";
				return content + separator + text + "\n";
			});
		}
		new Notice("Transaction added!");
	};

	/**
	 * Formats a Transaction to PTA text for writing to file.
	 */
	private formatTransaction(txn: Transaction): string {
		const TARGET_WIDTH = 64;
		const INDENT = "  ";
		const MIN_GAP = 2;

		const lines = [`${txn.date} ${txn.description}`];

		txn.entries.forEach((entry) => {
			const amountCurrency = `${entry.amount} ${entry.currency}`;
			const contentLen =
				INDENT.length + entry.account.length + amountCurrency.length;
			const padding = " ".repeat(
				Math.max(MIN_GAP, TARGET_WIDTH - contentLen),
			);

			let line = `${INDENT}${entry.account}${padding}${amountCurrency}`;

			if (entry.conversion) {
				line += ` @@ ${entry.conversion.amount} ${entry.conversion.currency}`;
			}

			lines.push(line);
		});

		return lines.join("\n");
	}

	// --- App context data (must be last — references arrow fields above) ---

	// Immutable snapshot of all app state. Every mutation creates a new object (via spread)
	// so useSyncExternalStore detects changes by reference equality.
	private appContextData: AppContextData = {
		transactions: [],
		transactionsLoading: true,
		transactionsStale: false,
		parseErrors: [],
		errors: [],
		accounts: new Map(),
		appSettings: getDefaultSettings(),
		userPreferences: getDefaultUserPreferences(),
		searchQuery: "",
		updateUserPreferences: this.saveUserPreferences,
		updateSearchQuery: this.updateSearchQuery,
		reloadStaleData: this.reloadStaleData,
		openAddTransactionModal: this.openAddTransactionModal,
		saveTransactionToFile: this.saveTransactionToFile,
	};
}
