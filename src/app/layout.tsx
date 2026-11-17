import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-edge px-4 py-8">
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
