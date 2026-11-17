import { connection } from "next/server";
import { Suspense } from "react";
import { DemoBanner } from "@/components/DemoBanner";
import { PlayerChip, RecentSearches } from "@/components/RecentSearches";
import { SearchBar } from "@/components/SearchBar";
import { Wordmark } from "@/components/SiteHeader";
import { isDemoMode } from "@/lib/profile";

const SAMPLE_PLAYERS = [
  { region: "euw", gameName: "Buddy", tagLine: "LOL" },
  { region: "na", gameName: "Mid Gap", tagLine: "NA1" },
  { region: "kr", gameName: "Baron Thief", tagLine: "KR1" },
];

const FEATURES = [
  {
    title: "Rank",
    body: "Solo and flex tier, LP and season win rate.",
    // Shield
    icon: "M12 3 5 6v5c0 4.5 2.9 8.2 7 10 4.1-1.8 7-5.5 7-10V6l-7-3Z",
  },
  {
    title: "Match history",
    body: "Every recent game with builds, runes and the full scoreboard.",
    // List
    icon: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  },
  {
    title: "Champions",
    body: "Win rate and KDA per champion, plus mastery.",
    // Bar chart
    icon: "M5 20V10m7 10V4m7 16v-7",
  },
];

/** Whether a key is configured is only known when the server is running, not at build time. */
async function DemoMode({ children }: { children: React.ReactNode }) {
  await connection();
  return isDemoMode() ? children : null;
}

export default function Home() {
  return (
    <>
      <Suspense>
        <DemoMode>
          <DemoBanner />
        </DemoMode>
      </Suspense>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:pt-28">
        <p className="label-caps mb-5">League of Legends player lookup</p>
        <h1 className="text-5xl sm:text-7xl">
          <Wordmark />
        </h1>
        <p className="mt-4 max-w-xl text-lg text-soft">
          Look up any League of Legends player. Rank, match history and champion
          stats, without the clutter.
        </p>

        <div className="mt-10">
          <SearchBar size="lg" autoFocus />
          <p className="mt-2 text-sm text-faint">
            Search by Riot ID. Leave out the tag to use your region&apos;s default.
          </p>
        </div>

        <div className="mt-10 space-y-8">
          <RecentSearches />

          <Suspense>
            <DemoMode>
              <section>
                <h2 className="label-caps mb-3">Try a sample profile</h2>
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

        <ul className="mt-20 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="card p-5">
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
              <h2 className="mt-4 font-medium">{feature.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-soft">{feature.body}</p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
