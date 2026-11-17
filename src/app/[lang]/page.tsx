import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoBanner } from "@/components/DemoBanner";
import { NavLinks } from "@/components/NavLinks";
import { PinnedPlayers } from "@/components/PinnedPlayers";
import { PlayerChip, RecentSearches } from "@/components/RecentSearches";
import { SearchBar } from "@/components/SearchBar";
import { Wordmark } from "@/components/SiteHeader";
import { getDict } from "@/i18n/server";
import { isDemoMode } from "@/lib/profile";

const SAMPLE_PLAYERS = [
  { region: "euw", gameName: "Buddy", tagLine: "LOL" },
  { region: "na", gameName: "Mid Gap", tagLine: "NA1" },
  { region: "kr", gameName: "Baron Thief", tagLine: "KR1" },
];

/** Icons for the feature cards; the text comes from the dictionary. */
const FEATURES = [
  { id: "profiles", href: null, icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" },
  {
    id: "live",
    href: null,
    icon: "M4.9 19.1a10 10 0 0 1 0-14.2m14.2 0a10 10 0 0 1 0 14.2M7.8 16.2a6 6 0 0 1 0-8.4m8.4 0a6 6 0 0 1 0 8.4M12 12h.01",
  },
  {
    id: "multi",
    href: "/multisearch",
    icon: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 8a5 5 0 0 1 10 0m2-8a3 3 0 1 0 0-6m1 14h3a5 5 0 0 0-4-4.9",
  },
  { id: "champions", href: "/champions", icon: "M5 20V10m7 10V4m7 16v-7" },
  {
    id: "leaderboards",
    href: "/leaderboards/euw",
    icon: "M8 4h8v5a4 4 0 0 1-8 0V4Zm4 9v4m-4 3h8M8 6H5a3 3 0 0 0 3 4m8-4h3a3 3 0 0 1-3 4",
  },
  { id: "rank", href: null, icon: "M12 3 5 6v5c0 4.5 2.9 8.2 7 10 4.1-1.8 7-5.5 7-10V6l-7-3Z" },
] as const;

/** Whether a key is configured is only known when the server is running, not at build time. */
async function DemoMode({ children }: { children: React.ReactNode }) {
  await connection();
  return isDemoMode() ? children : null;
}

export default async function Home() {
  const t = await getDict();
  return (
    <>
      <Suspense>
        <DemoMode>
          <DemoBanner />
        </DemoMode>
      </Suspense>

      {/* The page itself is the wordmark, so this bar only carries navigation. */}
      <header className="mx-auto flex max-w-6xl justify-end px-4 py-3">
        <NavLinks />
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:pt-16">
        <p className="label-caps mb-5">{t.home.kicker}</p>
        <h1 className="text-5xl sm:text-7xl">
          <Wordmark />
        </h1>
        <p className="mt-4 max-w-xl text-lg text-soft">{t.home.intro}</p>

        <div className="mt-10">
          <SearchBar size="lg" autoFocus />
          <p className="mt-2 text-sm text-faint">{t.home.searchHint}</p>
        </div>

        <div className="mt-10 space-y-8">
          <Suspense fallback={null}>
            <PinnedPlayers />
          </Suspense>
          <RecentSearches />

          <Suspense>
            <DemoMode>
              <section>
                <h2 className="label-caps mb-3">{t.home.samples}</h2>
                <ul className="flex flex-wrap gap-2">
                  {SAMPLE_PLAYERS.map((p) => (
                    <li key={p.gameName}>
                      <PlayerChip {...p} />
                    </li>
                  ))}
                </ul>
              </section>
            </DemoMode>
          </Suspense>
        </div>

        <ul className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.id} className="card relative p-5 transition-colors has-[a:hover]:border-faint">
              <svg
                viewBox="0 0 24 24"
                className="size-6 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={feature.icon} />
              </svg>
              <h2 className="mt-4 font-medium">
                {feature.href ? (
                  // The link covers the whole card.
                  <Link href={feature.href} className="rounded after:absolute after:inset-0">
                    {t.home.features[feature.id].title}
                  </Link>
                ) : (
                  t.home.features[feature.id].title
                )}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-soft">{t.home.features[feature.id].body}</p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
