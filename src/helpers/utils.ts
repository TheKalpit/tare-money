import { type TareMoneySettings, UserPreferences } from "./types";
import { DEFAULT_TRANSACTIONS_DIR, NUMBER_FORMATS } from "./constants";
import { moment } from "obsidian";

const SUPPORTED_LOCALES = new Set(NUMBER_FORMATS.map((f) => f.locale));

/**
 * Best-effort locale detection from the OS/browser.
 * Matches navigator.language against supported number formats,
 * falling back to base language match (e.g. "en" → "en-US"), then "en-US".
 */
export function detectLocale(): string {
	const lang = navigator.language;
	if (SUPPORTED_LOCALES.has(lang)) return lang;
	const base = lang.split("-")[0];
	const match = NUMBER_FORMATS.find((f) => f.locale.startsWith(base + "-"));
	return match?.locale ?? "en-US";
}

/** Default settings used when no user overrides exist. */
export function getDefaultSettings(): TareMoneySettings {
	return {
		transactionsDir: DEFAULT_TRANSACTIONS_DIR,
		numberLocale: detectLocale(),
	};
}

/** Default user preferences, reset each year (date range = current year). */
export function getDefaultUserPreferences(): UserPreferences {
	const currentYear = new Date().getFullYear();
	return {
		activeTab: "balances",
		dateFrom: `${currentYear}-01-01`,
		dateTo: `${currentYear}-12-31`,
		hide_zero_balances: true,
	};
}

/** Parses a YYYY-MM-DD string to a local Date. Returns null if empty or invalid. */
export function parseDateString(dateString: string): Date | null {
	if (!dateString) return null;
	const m = moment(dateString, "YYYY-MM-DD", true); // strict mode rejects malformed dates
	return m.isValid() ? m.toDate() : null;
}

/** Formats a Date as YYYY-MM-DD string. Returns empty string if null. */
export function formatDate(d: Date | null): string {
	if (!d) return "";
	return moment(d).format("YYYY-MM-DD");
}

/** Extracts #hashtags from a description string. */
export function extractTags(description: string): string[] {
	// m[1] is always defined when the non-optional (\w+) group matches
	return [...description.matchAll(/#(\w+)/g)].map((m) => m[1] as string);
}

export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}
