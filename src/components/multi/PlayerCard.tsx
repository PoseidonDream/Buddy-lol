import Link from "next/link";
import { championIcon, profileIcon } from "@/lib/assets";
import { formatKda, initials, kdaRatio, percent } from "@/lib/format";
import { APEX_TIERS, POSITION_NAMES, tierName } from "@/lib/game-data";
import { profilePath, type RiotId } from "@/lib/riot-id";
import { outcomeOf, summarize, type Outcome } from "@/lib/stats";
import type { Profile, ProfileError } from "@/lib/types";
import { GameIcon } from "../GameIcon";
import { kdaTone } from "../profile/SummaryPanel";
import { TierEmblem } from "../TierEmblem";

const FORM_TILE: Record<Outcome, string> = { win: "bg-win", loss: "bg-loss", remake: "bg-faint/60" };

function Shell({ children }: { children: React.ReactNode }) {
  return <li className="card flex min-h-80 flex-col p-4">{children}</li>;
}

export function PlayerCard({ profile }: { profile: Profile }) {
  const solo = profile.ranked.find((r) => r.queue === "RANKED_SOLO_5x5");
  const summary = summarize(profile.matches);
  const ratio = kdaRatio(summary.kills, summary.deaths, summary.assists);
  const mainRole = [...summary.roles].sort((a, b) => b.games - a.games)[0];
  const href = profilePath(profile.regionSlug, profile);

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <GameIcon
          src={profileIcon(profile.assetVersion, profile.profileIconId)}
          alt=""
          className="size-11 rounded-xl ring-1 ring-edge"
        />
        <div className="min-w-0">
          <Link href={href} className="block truncate rounded-sm font-semibold hover:underline">
            {profile.gameName}
          </Link>
          <p className="truncate font-mono text-xs text-faint">
            #{profile.tagLine} · lvl {profile.level}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-edge pt-4">
        <TierEmblem tier={solo?.tier ?? null} size={40} />
        {solo ? (
          <div className="leading-tight">
            <p className="font-medium">
              {tierName(solo.tier)}
              {APEX_TIERS.has(solo.tier) ? "" : ` ${solo.division}`}
            </p>
            <p className="font-mono text-xs text-soft">
              {solo.lp} LP · {percent(solo.wins, solo.wins + solo.losses)}% of{" "}
              {solo.wins + solo.losses}
            </p>
          </div>
        ) : (
          <p className="text-sm text-soft">Unranked in solo queue</p>
        )}
      </div>

      <div className="mt-4 border-t border-edge pt-4">
        <p className="label-caps">Last {profile.matches.length} games</p>
        {summary.games > 0 ? (
          <>
            <div className="mt-2 flex items-center justify-between gap-2">
              <ol className="flex gap-1" aria-label="Results, most recent first">
                {profile.matches.map((m) => {
                  const outcome = outcomeOf(m);
                  return (
                    <li key={m.id} title={outcome} className={`size-3 rounded-[3px] ${FORM_TILE[outcome]}`}>
                      <span className="sr-only">{outcome}</span>
                    </li>
                  );
                })}
              </ol>
              <span className="font-mono text-xs">
                <span className={kdaTone(ratio)}>{formatKda(ratio)}</span>
                <span className="text-faint"> KDA</span>
              </span>
            </div>
            {mainRole.games > 0 && (
              <p className="mt-2 text-xs text-soft">
                Mostly {POSITION_NAMES[mainRole.position]} ({mainRole.games} of {summary.games})
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-soft">No recent games.</p>
        )}
      </div>

      {summary.champions.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-edge pt-4">
          {summary.champions.slice(0, 3).map((c) => {
            const champRatio = kdaRatio(c.kills, c.deaths, c.assists);
            return (
              <li key={c.championKey} className="flex items-center gap-2 text-sm">
                <GameIcon
                  src={championIcon(profile.assetVersion, c.championKey)}
                  alt=""
                  label={initials(c.championName)}
                  className="size-7 rounded-md"
                />
                <span className="min-w-0 flex-1 truncate">{c.championName}</span>
                <span className="font-mono text-xs text-faint">
                  {c.wins}-{c.games - c.wins}
                </span>
                <span className={`w-10 text-right font-mono text-xs ${kdaTone(champRatio)}`}>
                  {formatKda(champRatio)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={href}
        className="mt-auto block pt-4 text-center text-sm text-accent hover:underline"
      >
        Full profile
      </Link>
    </Shell>
  );
}

export function PlayerCardProblem({ id, error }: { id: RiotId; error: ProfileError }) {
  return (
    <Shell>
      <p className="truncate font-semibold">
        {id.gameName}
        <span className="font-normal text-faint"> #{id.tagLine}</span>
      </p>
      <p className="mt-3 text-sm text-soft">{error.message}</p>
    </Shell>
  );
}

export function PlayerCardSkeleton() {
  return (
    <li className="card min-h-80 animate-pulse p-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-raised" />
        <div className="h-4 w-28 rounded bg-raised" />
      </div>
      <div className="mt-6 h-10 rounded-lg bg-raised" />
      <div className="mt-6 h-16 rounded-lg bg-raised" />
      <div className="mt-6 h-24 rounded-lg bg-raised" />
    </li>
  );
}
