"use client";

import Link from "next/link";
import { useDict } from "@/i18n/client";
import type { Dict } from "@/i18n/dictionaries";
import { championIcon } from "@/lib/assets";
import { formatCompact, formatNumber, initials, kdaRatio } from "@/lib/format";
import { profilePath } from "@/lib/riot-id";
import type { ItemNames, MatchSummary, TeamSummary } from "@/lib/types";
import { GameIcon } from "../GameIcon";
import { ItemRow, Loadout, PlayerLink, ScoreBadge } from "./MatchParts";
import { kdaTone } from "./SummaryPanel";

function teamTitle(match: MatchSummary, team: TeamSummary, t: Dict): string {
  if (team.placement) return t.scoreboard.placed(team.placement);
  const side = team.id === 100 ? t.game.blueSide : t.game.redSide;
  if (match.remake) return side;
  return `${team.win ? t.game.win : t.game.loss} · ${side}`;
}

export function MatchDetails({
  match,
  regionSlug,
  assetVersion,
  itemNames,
}: {
  match: MatchSummary;
  regionSlug: string;
  assetVersion: string;
  itemNames: ItemNames;
}) {
  const t = useDict();
  const everyone = match.teams.flatMap((team) => team.participants);
  const topDamage = Math.max(1, ...everyone.map((p) => p.damage));
  const minutes = match.durationSec / 60;
  const standard = match.teams.length === 2;

  return (
    <div className="space-y-4 p-3 sm:p-4">
      {match.teams.map((team) => {
        const tone = match.remake ? "text-soft" : team.win ? "text-win" : "text-loss";
        return (
          <div key={team.id} className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-y-1 text-left text-xs">
              <caption className="mb-1 text-left">
                <span className={`font-semibold ${tone}`}>{teamTitle(match, team, t)}</span>
                <span className="ml-3 font-mono text-faint">
                  {t.scoreboard.teamLine(team.kills, formatCompact(team.gold))}
                  {standard && ` · ${t.scoreboard.objectives(team.towers, team.dragons, team.barons)}`}
                </span>
              </caption>
              <thead>
                <tr className="label-caps">
                  <th scope="col" className="pb-1 font-normal">{t.scoreboard.player}</th>
                  <th scope="col" className="pb-1 font-normal">{t.scoreboard.score}</th>
                  <th scope="col" className="pb-1 font-normal">KDA</th>
                  <th scope="col" className="pb-1 font-normal">{t.scoreboard.damage}</th>
                  <th scope="col" className="pb-1 font-normal">CS</th>
                  <th scope="col" className="pb-1 font-normal">{t.scoreboard.gold}</th>
                  <th scope="col" className="pb-1 font-normal">{t.scoreboard.vision}</th>
                  <th scope="col" className="pb-1 font-normal">{t.scoreboard.items}</th>
                </tr>
              </thead>
              <tbody>
                {team.participants.map((p) => {
                  const ratio = kdaRatio(p.kills, p.deaths, p.assists);
                  const isMe = p.puuid === match.me.puuid;
                  return (
                    <tr key={p.puuid} className={isMe ? "bg-white/5" : undefined}>
                      <th scope="row" className="rounded-l-lg py-1 pl-2 pr-3 font-normal">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <GameIcon
                              src={championIcon(assetVersion, p.championKey)}
                              alt={p.championName}
                              label={initials(p.championName)}
                              className="size-8 rounded-lg"
                            />
                            <span className="absolute -bottom-1 -right-1 rounded bg-ink px-0.5 font-mono text-[9px] tabular-nums">
                              {p.champLevel}
                            </span>
                          </div>
                          <Loadout player={p} assetVersion={assetVersion} size="size-4" />
                          <PlayerLink
                            player={p}
                            regionSlug={regionSlug}
                            className={`max-w-32 truncate text-sm ${isMe ? "font-semibold" : ""}`}
                          />
                          {!isMe && p.tagLine && (
                            <Link
                              href={`${profilePath(regionSlug, p)}#comments`}
                              prefetch={false}
                              title={t.scoreboard.comment(p.gameName)}
                              aria-label={t.scoreboard.comment(p.gameName)}
                              className="shrink-0 rounded p-0.5 text-faint transition-colors hover:text-accent"
                            >
                              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M4 5h16v11H8l-4 4V5Z" strokeLinejoin="round" />
                              </svg>
                            </Link>
                          )}
                        </div>
                      </th>
                      <td className="py-1 pr-3">
                        <ScoreBadge player={p} />
                      </td>
                      <td className="py-1 pr-3 font-mono tabular-nums">
                        <div>
                          {p.kills}/{p.deaths}/{p.assists}
                        </div>
                        <div className={kdaTone(ratio)}>{t.game.kda(ratio)}</div>
                      </td>
                      <td className="py-1 pr-3">
                        <div className="font-mono tabular-nums" title={t.scoreboard.taken(formatNumber(p.damageTaken))}>
                          {formatNumber(p.damage)}
                        </div>
                        <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-edge">
                          <div
                            className={team.win && !match.remake ? "h-full bg-win" : "h-full bg-loss"}
                            style={{ width: `${(p.damage / topDamage) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-1 pr-3 font-mono tabular-nums">
                        <div>{p.cs}</div>
                        <div className="text-faint">{(p.cs / minutes).toFixed(1)}/m</div>
                      </td>
                      <td className="py-1 pr-3 font-mono tabular-nums">{formatCompact(p.gold)}</td>
                      <td className="py-1 pr-3 font-mono tabular-nums">
                        <div>{p.visionScore}</div>
                        <div className="text-faint" title={t.scoreboard.wards}>
                          {p.wardsPlaced}/{p.wardsKilled}
                        </div>
                      </td>
                      <td className="rounded-r-lg py-1 pr-2">
                        <ItemRow
                          items={p.items}
                          itemNames={itemNames}
                          assetVersion={assetVersion}
                          size="size-6"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
