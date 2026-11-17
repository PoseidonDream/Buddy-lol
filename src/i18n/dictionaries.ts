import type { Locale } from "./config";
import { en, type Dict } from "./en";
import { tr } from "./tr";

export type { Dict };

export const dictionaries: Record<Locale, Dict> = { en, tr };
