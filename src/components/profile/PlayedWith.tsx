import { championIcon } from "@/lib/assets";
import { initials, percent } from "@/lib/format";
import type { Teammate } from "@/lib/stats";
import { GameIcon } from "../GameIcon";
import { PlayerLink } from "./MatchParts";

/** Who this player keeps ending up on a team with, in the games loaded so far. */
export function PlayedWith({
  teammates,
  games,
  regionSlug,
  assetVersion,
}: {
  teammates: Teammate[];
  /** How many games the list is drawn from. */
  games: number;
  regionSlug: string;
  assetVersion: string;
}) {
  if (games < 5) return null;
  return (
    <section className="card">
      <h2 className="label-caps px-4 pt-4">Played with</h2>
      {teammates.length === 0 ? (
        <p className="px-4 pb-4 pt-2 text-sm text-soft">
          Nobody shows up twice in these {games} games. Load more matches to look further back.
        </p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-edge">
            {teammates.slice(0, 6).map((t) => {
              const rate = percent(t.wins, t.games);
              return (
                <li key={t.puuid} className="flex items-center gap-3 px-4 py-2">
                  <GameIcon
                    src={championIcon(assetVersion, t.championKey)}
                    alt=""
                    label={initials(t.championName)}
                    className="size-8 rounded-lg"
                  />
                  <div className="min-w-0 flex-1 leading-tight">
                    <PlayerLink player={t} regionSlug={regionSlug} className="block truncate text-sm font-medium" />
                    <p className="truncate font-mono text-[11px] text-faint">#{t.tagLine}</p>
                  </div>
                  <div className="text-right leading-tight">
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        t.games >= 3 && rate >= 60 ? "text-win" : t.games >= 3 && rate <= 40 ? "text-loss" : ""
                      }`}
                    >
                      {rate}%
                    </p>
                    <p className="font-mono text-[11px] text-faint">
                      {t.wins}W {t.games - t.wins}L
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="px-4 pb-3 pt-1 text-[11px] text-faint">Same team, from the {games} games loaded.</p>
        </>
      )}
    </section>
  );
}
