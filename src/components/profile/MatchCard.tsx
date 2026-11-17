"use client";

import { useId, useState } from "react";
import { championIcon } from "@/lib/assets";
import {
  formatDuration,
  formatKda,
  initials,
  kdaRatio,
  MULTI_KILL_NAMES,
  ordinal,
  percent,
  timeAgo,
} from "@/lib/format";
import { queueName } from "@/lib/game-data";
import { highlights, outcomeOf, type Outcome } from "@/lib/stats";
import type { ItemNames, MatchSummary } from "@/lib/types";
import { GameIcon } from "../GameIcon";
import { MatchDetails } from "./MatchDetails";
import { ItemRow, Loadout, PlayerLink, ScoreBadge } from "./MatchParts";
import { kdaTone } from "./SummaryPanel";

const OUTCOME_STYLE: Record<Outcome, { card: string; text: string; label: string }> = {
  win: { card: "border-l-win bg-win-wash", text: "text-win", label: "Victory" },
  loss: { card: "border-l-loss bg-loss-wash", text: "text-loss", label: "Defeat" },
  remake: { card: "border-l-faint bg-panel", text: "text-soft", label: "Remake" },
};

function Roster({
  match,
  regionSlug,
  assetVersion,
}: {
  match: MatchSummary;
  regionSlug: string;
  assetVersion: string;
}) {
  return (
    <div className="hidden w-60 shrink-0 grid-cols-2 gap-x-3 xl:grid">
      {match.teams.map((team) => (
        <ul key={team.id} className="space-y-0.5">
          {team.participants.map((p) => (
            <li key={p.puuid} className="flex items-center gap-1.5">
              <GameIcon
                src={championIcon(assetVersion, p.championKey)}
                alt={p.championName}
                label={initials(p.championName).slice(0, 1)}
                className="size-4 rounded-sm"
              />
              <PlayerLink
                player={p}
                regionSlug={regionSlug}
                className={`truncate text-xs ${p.puuid === match.me.puuid ? "font-semibold text-fg" : "text-soft"}`}
              />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

export function MatchCard({
  match,
  regionSlug,
  assetVersion,
  itemNames,
  now,
}: {
  match: MatchSummary;
  regionSlug: string;
  assetVersion: string;
  itemNames: ItemNames;
  now: number;
}) {
  const [open, setOpen] = useState(false);
  const { me } = match;
  const outcome = outcomeOf(match);
  const style = OUTCOME_STYLE[outcome];
  const minutes = match.durationSec / 60;
  const ratio = kdaRatio(me.kills, me.deaths, me.assists);
  const teamKills = match.teams.find((t) => t.id === me.teamId)?.kills ?? 0;
  const multiKill = MULTI_KILL_NAMES[me.largestMultiKill];
  const tags = highlights(match);
  const detailsId = useId();
  const queue = queueName(match.queueId, match.gameMode);
  const result = me.placement ? `${ordinal(me.placement)} place` : style.label;

  return (
    <li
      data-match={match.id}
      className={`overflow-hidden rounded-xl border border-edge border-l-4 transition-shadow hover:ring-1 hover:ring-white/10 ${style.card}`}
    >
      <div className="flex items-center gap-3 p-3 sm:gap-4 sm:px-4">
        <div className="w-24 shrink-0 text-xs leading-relaxed max-sm:hidden">
          <p className={`font-semibold ${style.text}`}>{queue}</p>
          <p className="text-faint">{timeAgo(match.endedAt, now)}</p>
          <p className="mt-1 font-medium text-fg">{result}</p>
          <p className="font-mono text-faint">{formatDuration(match.durationSec)}</p>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <p className="text-xs sm:hidden">
            <span className={`font-semibold ${style.text}`}>{queue}</span>
            <span className="text-fg"> · {result}</span>
            <span className="text-faint">
              {" "}
              · {formatDuration(match.durationSec)} · {timeAgo(match.endedAt, now)}
            </span>
          </p>

          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <GameIcon
                  src={championIcon(assetVersion, me.championKey)}
                  alt={me.championName}
                  label={initials(me.championName)}
                  className="size-14 rounded-xl text-sm"
                />
                <span className="absolute -bottom-1 -right-1 rounded-md bg-ink px-1 font-mono text-[10px] tabular-nums">
                  {me.champLevel}
                </span>
              </div>
              <Loadout player={me} assetVersion={assetVersion} />
            </div>

            <div className="shrink-0 leading-tight">
              <p className="text-base font-semibold tabular-nums">
                {me.kills} <span className="text-faint">/</span>{" "}
                <span className="text-loss">{me.deaths}</span>{" "}
                <span className="text-faint">/</span> {me.assists}
              </p>
              <p className="mt-0.5 font-mono text-xs">
                <span className={kdaTone(ratio)}>{formatKda(ratio)}</span>
                <span className="text-faint"> KDA</span>
              </p>
              <p className="mt-1.5">
                <ScoreBadge player={me} />
              </p>
            </div>

            <dl className="shrink-0 font-mono text-xs leading-relaxed text-soft max-[420px]:hidden">
              <div>
                <dt className="sr-only">Creep score</dt>
                <dd>
                  {me.cs} CS <span className="text-faint">({(me.cs / minutes).toFixed(1)})</span>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Kill participation</dt>
                <dd>{percent(me.kills + me.assists, teamKills)}% KP</dd>
              </div>
              <div>
                <dt className="sr-only">Vision score</dt>
                <dd>{me.visionScore} vision</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <ItemRow items={me.items} itemNames={itemNames} assetVersion={assetVersion} />
            {(multiKill || tags.length > 0) && (
              <ul className="flex flex-wrap gap-1.5 text-[11px] font-medium">
                {multiKill && (
                  <li className="rounded-full bg-gold/15 px-2 py-0.5 text-gold">{multiKill}</li>
                )}
                {tags.map((tag) => (
                  <li key={tag} className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {match.teams.length === 2 && (
          <Roster match={match} regionSlug={regionSlug} assetVersion={assetVersion} />
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={detailsId}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-soft transition-colors hover:bg-ink/40 hover:text-fg"
        >
          <span className="sr-only">{open ? "Hide" : "Show"} scoreboard</span>
          <svg
            viewBox="0 0 16 16"
            className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div id={detailsId} className="border-t border-edge bg-ink/40">
          <MatchDetails
            match={match}
            regionSlug={regionSlug}
            assetVersion={assetVersion}
            itemNames={itemNames}
          />
        </div>
      )}
    </li>
  );
}
