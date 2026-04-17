import type TareMoneyPlugin from "../main";
import React, { StrictMode, useSyncExternalStore } from "react";
import { AppContext } from "../helpers/appContext";

export default function ReactViewRootWrap({
	plugin,
	children,
}: {
	plugin: TareMoneyPlugin;
	children: React.ReactNode;
}) {
	const snapshot = useSyncExternalStore(
		plugin.subscribe,
		plugin.getAppContextData,
	);

	return (
		<StrictMode>
			<AppContext.Provider value={snapshot}>
				{children}
			</AppContext.Provider>
		</StrictMode>
	);
}
