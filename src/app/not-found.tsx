import type { Metadata } from "next";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="label-caps">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">There&apos;s nothing here</h1>
        <p className="mt-3 text-soft">
          That page doesn&apos;t exist. If you were looking for a player, search
          for their Riot ID.
        </p>
        <div className="mt-8 text-left">
          <SearchBar size="lg" />
        </div>
        <Link href="/" className="mt-6 inline-block rounded text-sm text-accent hover:underline">
          Back to the home page
        </Link>
      </main>
    </>
  );
}
