import type { Metadata } from "next";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { SiteHeader } from "@/components/SiteHeader";
import { getDict } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).notFound.title };
}

export default async function NotFound() {
  const t = await getDict();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="label-caps">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t.notFound.heading}</h1>
        <p className="mt-3 text-soft">{t.notFound.body}</p>
        <div className="mt-8 text-left">
          <SearchBar size="lg" />
        </div>
        <Link href="/" className="mt-6 inline-block rounded text-sm text-accent hover:underline">
          {t.notFound.home}
        </Link>
      </main>
    </>
  );
}
