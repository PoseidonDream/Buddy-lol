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
  ["Rank", "Solo and flex tier, LP and season win rate."],
  ["Match history", "Every recent game with builds, runes and the full scoreboard."],
  ["Champions", "Win rate and KDA per champion, plus mastery."],
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
                <h2 className="label-caps mb-3">
                  Try a sample profile
                </h2>
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

        <dl className="mt-20 grid gap-6 border-t border-edge pt-8 sm:grid-cols-3">
          {FEATURES.map(([title, body]) => (
            <div key={title}>
              <dt className="font-medium">{title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-soft">{body}</dd>
            </div>
          ))}
        </dl>
      </main>
    </>
  );
}
