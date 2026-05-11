import { createContext } from "react";
import type { Transaction } from "./types";
import type { ParseError } from "../core/parser";
import type { TareMoneySettings, UserPreferences } from "./settings";

export interface AppContextData {
	readonly transactions: Transaction[];
	readonly transactionsLoading: boolean;
	readonly transactionsStale: boolean;
	readonly parseErrors: ParseError[];
	readonly errors: string[];
	readonly accounts: Map<string, string>;
	readonly appSettings: TareMoneySettings;
	readonly userPreferences: UserPreferences;
	readonly searchQuery: string;
	readonly updateUserPreferences: (updates: Partial<UserPreferences>) => void;
	readonly updateSearchQuery: (query: string) => void;
	readonly reloadStaleData: () => Promise<void>;
	readonly saveTransactionToFile: (transaction: Transaction) => Promise<void>;
}

export const AppContext = createContext<AppContextData>(null!);
