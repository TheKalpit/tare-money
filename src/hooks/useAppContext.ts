import { useContext } from "react";
import { AppContext, AppContextData } from "../helpers/appContext";

export function useAppContext(): AppContextData {
	return useContext(AppContext);
}
