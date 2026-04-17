import { useContext } from "react";
import { AppContext } from "../helpers/appContext";
import { AppContextData } from "../helpers/types";

export function useAppContext(): AppContextData {
	return useContext(AppContext);
}
