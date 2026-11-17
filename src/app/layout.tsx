import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { connection } from "next/server";
import { Suspense } from "react";
import { notesEnabled } from "@/lib/notes-auth";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Buddy.lol · League of Legends player lookup",
    template: "%s · Buddy.lol",
  },
  description:
    "Look up any League of Legends player: rank, match history, champion stats and mastery.",
  applicationName: "Buddy.lol",
  openGraph: {
    type: "website",
    siteName: "Buddy.lol",
    title: "Buddy.lol · League of Legends player lookup",
    description:
      "Look up any League of Legends player: rank, match history, champion stats and mastery.",
  },
};

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-edge px-4 py-8">
          <nav aria-label="Footer" className="mx-auto mb-3 flex max-w-6xl items-center gap-4 text-xs">
            <Link href="/privacy" className="rounded text-soft hover:text-fg hover:underline">
              Privacy
            </Link>
            <Suspense fallback={null}>
              <Feedback />
            </Suspense>
          </nav>
          <p className="mx-auto max-w-6xl text-xs leading-relaxed text-faint">
            Buddy.lol isn&apos;t endorsed by Riot Games and doesn&apos;t reflect
            the views or opinions of Riot Games or anyone officially involved in
            producing or managing Riot Games properties. Riot Games, and all
            associated properties are trademarks or registered trademarks of
            Riot Games, Inc.
          </p>
        </footer>
      </body>
    </html>
  );
}
