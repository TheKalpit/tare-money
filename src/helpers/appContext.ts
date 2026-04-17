import { createContext } from "react";
import { AppContextData } from "./types";

export const AppContext = createContext<AppContextData>(null!);
