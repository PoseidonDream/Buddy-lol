"use client";

import Link from "next/link";
import { useDict } from "@/i18n/client";
import { championIcon, profileIcon } from "@/lib/assets";
import { initials, kdaRatio, percent } from "@/lib/format";
import { APEX_TIERS } from "@/lib/game-data";
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
  const t = useDict();
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
            #{profile.tagLine} · {t.multi.level(profile.level)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-edge pt-4">
        <TierEmblem tier={solo?.tier ?? null} size={40} />
        {solo ? (
          <div className="leading-tight">
            <p className="font-medium">
              {t.game.tier(solo.tier)}
              {APEX_TIERS.has(solo.tier) ? "" : ` ${solo.division}`}
            </p>
            <p className="font-mono text-xs text-soft">
              {solo.lp} LP · {t.multi.rateOf(percent(solo.wins, solo.wins + solo.losses), solo.wins + solo.losses)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-soft">{t.multi.unrankedSolo}</p>
        )}
      </div>

      <div className="mt-4 border-t border-edge pt-4">
        <p className="label-caps">{t.summary.lastGames(profile.matches.length)}</p>
        {summary.games > 0 ? (
          <>
            <div className="mt-2 flex items-center justify-between gap-2">
              <ol className="flex gap-1" aria-label={t.summary.form}>
                {profile.matches.map((m) => {
                  const outcome = outcomeOf(m);
                  return (
                    <li key={m.id} title={t.summary.outcome[outcome]} className={`size-3 rounded-[3px] ${FORM_TILE[outcome]}`}>
                      <span className="sr-only">{t.summary.outcome[outcome]}</span>
                    </li>
                  );
                })}
              </ol>
              <span className="font-mono text-xs">
                <span className={kdaTone(ratio)}>{t.game.kda(ratio)}</span>
                <span className="text-faint"> KDA</span>
              </span>
            </div>
            {mainRole.games > 0 && (
              <p className="mt-2 text-xs text-soft">
                {t.multi.mostly(t.game.position(mainRole.position), mainRole.games, summary.games)}
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-soft">{t.multi.noGames}</p>
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
                  {t.game.kda(champRatio)}
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
        {t.multi.fullProfile}
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
