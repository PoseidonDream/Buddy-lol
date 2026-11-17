import "server-only";

import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./config";
import { dictionaries, type Dict } from "./dictionaries";

/**
 * The visitor's language where root params aren't available: server actions
 * and route handlers. Same rule as the proxy.
 */
export async function requestLocale(): Promise<Locale> {
  const [jar, list] = await Promise.all([cookies(), headers()]);
  return resolveLocale(jar.get(LOCALE_COOKIE)?.value, list.get("accept-language"));
}

export async function requestDict(): Promise<Dict> {
  return dictionaries[await requestLocale()];
}
