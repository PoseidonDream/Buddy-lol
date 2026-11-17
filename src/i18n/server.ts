import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { dictionaries, type Dict } from "./dictionaries";

/** The language of the page being rendered (server components only). */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  if (!isLocale(value)) notFound();
  return value;
}

/** The page's text, for server components. */
export async function getDict(): Promise<Dict> {
  return dictionaries[await getLocale()];
}

export { DEFAULT_LOCALE };
