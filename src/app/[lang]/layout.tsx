import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { connection } from "next/server";
import { Suspense } from "react";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { I18nProvider } from "@/i18n/client";
import { LOCALES } from "@/i18n/config";
import { getDict, getLocale } from "@/i18n/server";
import { notesEnabled } from "@/lib/notes-auth";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// latin-ext carries Turkish letters (ğ, ş, ı, İ).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return {
    title: { default: t.meta.title, template: "%s · Buddy.lol" },
    description: t.meta.description,
    applicationName: "Buddy.lol",
    // Added to an iPhone's home screen, it opens full screen under this name.
    appleWebApp: { capable: true, title: "Buddy.lol", statusBarStyle: "black" },
    formatDetection: { telephone: false },
    openGraph: {
      type: "website",
      siteName: "Buddy.lol",
      title: t.meta.title,
      description: t.meta.description,
      locale: t.meta.ogLocale,
    },
  };
}

/** Every page exists in each language; the proxy picks one per visitor. */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: "#0b0a10",
  colorScheme: "dark",
};

/**
 * Feedback goes to the password-protected inbox, so the button only shows
 * when that password is set. Checked per request rather than when the page
 * shell is built, so the shell never disagrees with the settings it runs with.
 */
async function Feedback() {
  await connection();
  return notesEnabled() ? <FeedbackButton /> : null;
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  const t = await getDict();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale}>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-edge px-4 py-8">
          <nav aria-label={t.footer.label} className="mx-auto mb-3 flex max-w-6xl flex-wrap items-center gap-4 text-xs">
            <Link href="/privacy" className="rounded text-soft hover:text-fg hover:underline">
              {t.footer.privacy}
            </Link>
            <Suspense fallback={null}>
              <Feedback />
            </Suspense>
            <LanguageSwitch />
          </nav>
          <p className="mx-auto max-w-6xl text-xs leading-relaxed text-faint">{t.footer.legal}</p>
        </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
