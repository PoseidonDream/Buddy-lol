/** Languages the site is written in. Shared by the proxy, the server and the browser. */

export const LOCALES = ["en", "tr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Remembers a visitor's choice of language for a year. */
export const LOCALE_COOKIE = "buddy_lang";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_NAMES: Record<Locale, string> = { en: "English", tr: "Türkçe" };

/** For Intl formatters (dates, relative times). */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", tr: "tr-TR" };

/** Data Dragon's name for each language's static data. */
export const DDRAGON_LOCALE: Record<Locale, string> = { en: "en_US", tr: "tr_TR" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * The language to serve: the visitor's saved choice, else the first of ours
 * their browser asks for (by Accept-Language weight), else English.
 */
export function resolveLocale(cookie: string | undefined | null, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  const wanted = (acceptLanguage ?? "")
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q.slice(2)) : 1, i };
    })
    .filter((x) => x.lang && Number.isFinite(x.q) && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  return wanted.map((x) => x.lang).find(isLocale) ?? DEFAULT_LOCALE;
}
