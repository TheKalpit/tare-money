import { App, PluginSettingTab, Setting } from "obsidian";
import type TareMoneyPlugin from "../main";
import { getDefaultSettings } from "./utils";
import { NUMBER_FORMATS } from "./constants";
import { TareMoneySettings } from "./types";

export class TareMoneySettingTab extends PluginSettingTab {
	private settings: Partial<TareMoneySettings>;
	private saveSettings: (settings: Partial<TareMoneySettings>) => void;

	constructor(
		app: App,
		plugin: TareMoneyPlugin,
		settings: Partial<TareMoneySettings>,
		saveSettings: (settings: Partial<TareMoneySettings>) => void,
	) {
		super(app, plugin);
		this.settings = settings;
		this.saveSettings = saveSettings;
	}

	display(): void {
		// Take a fresh copy each time the tab is opened
		const defaults = getDefaultSettings();

		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Transactions directory")
			.setDesc(
				"Folder inside the vault where transaction files are stored",
			)
			.addText((text) =>
				text
					.setPlaceholder(defaults.transactionsDir)
					.setValue(this.settings.transactionsDir || "")
					.onChange((value) => {
						this.settings.transactionsDir = value.trim();
						if (!this.settings.transactionsDir) {
							delete this.settings.transactionsDir;
						}
					}),
			);

		new Setting(containerEl)
			.setName("Number format")
			.setDesc("How amounts are displayed")
			.addDropdown((dropdown) => {
				NUMBER_FORMATS.forEach((fmt) => {
					dropdown.addOption(fmt.locale, fmt.label);
				});
				dropdown
					.setValue(
						this.settings.numberLocale || defaults.numberLocale,
					)
					.onChange((value) => {
						this.settings.numberLocale = value;
					});
			});
	}

	hide(): void {
		this.saveSettings(this.settings);
	}
}
