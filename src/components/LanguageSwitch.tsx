"use client";

import { useDict, useLocale } from "@/i18n/client";
import { LOCALES, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, LOCALE_NAMES, type Locale } from "@/i18n/config";

/** Remembers the choice for the proxy, which serves every page in it from then on. */
function saveLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

/** English / Türkçe. Saves the choice in a cookie and reloads the page in that language. */
export function LanguageSwitch() {
  const current = useLocale();
  const t = useDict();

  function choose(locale: Locale) {
    if (locale === current) return;
    saveLocale(locale);
    window.location.reload();
  }

  return (
    <div role="group" aria-label={t.footer.language} className="ml-auto flex gap-1">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          onClick={() => choose(locale)}
          aria-pressed={locale === current}
          className={`rounded-md px-2 py-1 transition-colors ${
            locale === current ? "bg-raised text-fg" : "text-soft hover:text-fg"
          }`}
        >
          {LOCALE_NAMES[locale]}
        </button>
      ))}
    </div>
  );
}
