"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import { dictionaries, type Dict } from "./dictionaries";

const LocaleContext = createContext<Locale>("en");

/** Makes the page's language available to every client component below it. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** The page's text in the visitor's language. */
export function useDict(): Dict {
  return dictionaries[useContext(LocaleContext)];
}
