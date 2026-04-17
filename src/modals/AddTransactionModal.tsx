import { Modal } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import type TareMoneyPlugin from "../main";
import { AddTransactionForm } from "../components/AddTransactionForm";
import ReactViewRootWrap from "../components/ReactViewRootWrap";

export class AddTransactionModal extends Modal {
	private plugin: TareMoneyPlugin;
	private root: Root | null = null;

	constructor(plugin: TareMoneyPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onOpen(): void {
		this.setTitle("Add transaction");
		this.modalEl.addClass("tare-add-modal");

		this.root = createRoot(this.contentEl);
		this.root.render(
			<ReactViewRootWrap plugin={this.plugin}>
				<AddTransactionForm
					closeModal={() => {
						this.close();
					}}
				/>
			</ReactViewRootWrap>,
		);
	}

	onClose(): void {
		this.root?.unmount();
		this.root = null;
	}
}
