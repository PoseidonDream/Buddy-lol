import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale, resolveLocale } from "./i18n/config";

/**
 * Serves each page in the visitor's language without changing its address:
 * "/champions" is answered by "/tr/champions" for someone who reads Turkish.
 * Addresses that name a language ("/tr/champions") switch to it and drop
 * the prefix, so a "/tr" link can be shared to open the site in Turkish.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [, first] = pathname.split("/");

  if (isLocale(first)) {
    const rest = pathname.slice(first.length + 1) || "/";
    const response = NextResponse.redirect(new URL(rest + search, request.url));
    response.cookies.set(LOCALE_COOKIE, first, { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" });
    return response;
  }

  const locale = resolveLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language"));
  return NextResponse.rewrite(new URL(`/${locale}${pathname === "/" ? "" : pathname}${search}`, request.url));
}

export const config = {
  // Pages only: not the API, Next's own files, or files with an extension
  // (icons, robots.txt, riot.txt, the manifest).
  matcher: ["/((?!api/|_next/|_vercel/|.*\\.(?:png|jpe?g|webp|svg|ico|txt|xml|json|webmanifest|js|css|map)$).*)"],
};
