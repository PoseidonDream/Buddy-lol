"use client";

import { championIcon } from "@/lib/assets";
import { formatCompact, initials, percent } from "@/lib/format";
import { APEX_TIERS, queueName, tierName } from "@/lib/game-data";
import { rankFromValue, rankValue } from "@/lib/rank-scale";
import type { NoteSummary } from "@/lib/store/types";
import type { LiveGame, LivePlayer, LiveTeam, RankedEntry } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { GameIcon } from "../GameIcon";
import { TagChip } from "../notes/TagChip";
import { TierEmblem } from "../TierEmblem";
import { Loadout, PlayerLink } from "./MatchParts";

function rankLabel(r: Pick<RankedEntry, "tier" | "division">): string {
  return `${tierName(r.tier)}${APEX_TIERS.has(r.tier) ? "" : ` ${r.division}`}`;
}

/** The team's average rank among players who have one, e.g. "Gold II". */
function averageRank(team: LiveTeam): string | null {
  const values = team.players.flatMap((p) => (p.rank ? [rankValue(p.rank.tier, p.rank.division, p.rank.lp)] : []));
  if (values.length === 0) return null;
  const avg = rankFromValue(values.reduce((a, b) => a + b, 0) / values.length);
  return rankLabel(avg);
}

function WinRate({ rank }: { rank: RankedEntry }) {
  const games = rank.wins + rank.losses;
  const rate = percent(rank.wins, games);
  const tone = games >= 20 && rate >= 55 ? "text-win" : games >= 20 && rate <= 45 ? "text-loss" : "";
  return (
    <div className="leading-tight">
      <p className={`font-mono text-sm font-semibold tabular-nums ${tone}`}>{rate}%</p>
      <p className="font-mono text-[11px] tabular-nums text-faint">
        {rank.wins}W {rank.losses}L
      </p>
      <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-loss/60" aria-hidden="true">
        <div className="h-full bg-win" style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  focused,
  regionSlug,
  assetVersion,
  notes,
}: {
  player: LivePlayer;
  focused: boolean;
  regionSlug: string;
  assetVersion: string;
  notes: NoteSummary | undefined;
}) {
  const { rank, mastery } = player;
  return (
    <tr className={focused ? "bg-white/[0.06]" : undefined}>
      <td className="rounded-l-lg py-1.5 pl-2 pr-3">
        <div className="flex items-center gap-2">
          <GameIcon
            src={championIcon(assetVersion, player.championKey)}
            alt={player.championName}
            label={initials(player.championName)}
            className="size-9 rounded-lg"
          />
          <Loadout player={player} assetVersion={assetVersion} size="size-4" />
          <div className="min-w-0 leading-tight">
            <PlayerLink
              player={player}
              regionSlug={regionSlug}
              className={`block max-w-36 truncate text-sm ${focused ? "font-semibold" : ""}`}
            />
            <p className="truncate text-[11px] text-faint">
              {player.championName}
              {notes && (
                <span className="ml-1.5 rounded bg-gold/15 px-1 text-gold" title="You have notes on this player">
                  {notes.count} {notes.count === 1 ? "note" : "notes"}
                </span>
              )}
            </p>
            {notes && notes.tags.length > 0 && (
              <div className="mt-0.5 flex max-w-48 flex-wrap gap-0.5">
                {notes.tags.slice(0, 3).map((tag) => (
                  <TagChip key={tag} tag={tag} className="px-1! py-0! text-[10px]!" />
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="py-1.5 pr-3">
        {rank ? (
          <div className="flex items-center gap-2">
            <TierEmblem tier={rank.tier} size={26} />
            <div className="leading-tight">
              <p className="whitespace-nowrap text-sm">{rankLabel(rank)}</p>
              <p className="font-mono text-[11px] tabular-nums text-faint">
                {rank.lp} LP{rank.queue === "RANKED_FLEX_SR" ? " · flex" : ""}
                {/* The win rate column is hidden on phones; keep the number here. */}
                <span className="sm:hidden"> · {percent(rank.wins, rank.wins + rank.losses)}%</span>
              </p>
            </div>
          </div>
        ) : (
          <span className="text-sm text-faint">{player.puuid ? "Unranked" : "–"}</span>
        )}
      </td>
      <td className="py-1.5 pr-3 max-sm:hidden">{rank ? <WinRate rank={rank} /> : null}</td>
      <td className="rounded-r-lg py-1.5 pr-2 text-right max-md:hidden">
        {mastery ? (
          <div className="leading-tight">
            <p className="font-mono text-sm tabular-nums">{formatCompact(mastery.points)}</p>
            <p className="font-mono text-[11px] text-faint">level {mastery.level}</p>
          </div>
        ) : (
          <span className="text-sm text-faint" title="No mastery on this champion">
            –
          </span>
        )}
      </td>
    </tr>
  );
}

function Team({
  team,
  focusPuuid,
  regionSlug,
  assetVersion,
  notes,
}: {
  team: LiveTeam;
  focusPuuid: string;
  regionSlug: string;
  assetVersion: string;
  notes: Record<string, NoteSummary>;
}) {
  const blue = team.id === 100;
  const average = averageRank(team);
  return (
    <div className={`rounded-xl border p-3 ${blue ? "border-win/30 bg-win-wash" : "border-loss/30 bg-loss-wash"}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
        <h3 className={`text-sm font-semibold ${blue ? "text-win" : "text-loss"}`}>
          {blue ? "Blue side" : "Red side"}
          {average && <span className="ml-2 font-normal text-soft">avg {average}</span>}
        </h3>
        {team.bans.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="label-caps">Bans</span>
            <ul className="flex gap-1">
              {team.bans.map((ban) => (
                <li key={ban.championKey}>
                  <GameIcon
                    src={championIcon(assetVersion, ban.championKey)}
                    alt={ban.championName}
                    label={initials(ban.championName).slice(0, 1)}
                    className="size-5 rounded opacity-60 grayscale"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <table className="w-full border-separate border-spacing-y-0.5 text-left">
        <thead className="sr-only">
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Rank</th>
            <th scope="col">Win rate this season</th>
            <th scope="col">Mastery on this champion</th>
          </tr>
        </thead>
        <tbody>
          {team.players.map((p, i) => (
            <PlayerRow
              key={p.puuid ?? i}
              player={p}
              focused={p.puuid !== null && p.puuid === focusPuuid}
              regionSlug={regionSlug}
              assetVersion={assetVersion}
              notes={p.puuid ? notes[p.puuid] : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LiveGameCard({
  game,
  focusPuuid,
  regionSlug,
  assetVersion,
  fetchedAt,
  notes = {},
}: {
  game: LiveGame;
  /** The player whose profile this is, highlighted in the list. */
  focusPuuid: string;
  regionSlug: string;
  assetVersion: string;
  fetchedAt: number;
  /** Notes per player, shown to people who have unlocked notes. */
  notes?: Record<string, NoteSummary>;
}) {
  const now = useNow(fetchedAt);
  const minutes = game.startedAt === null ? null : Math.max(0, Math.floor((now - game.startedAt) / 60_000));

  return (
    <section className="card p-4 sm:p-5" aria-label="Live game">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-2 rounded-full bg-loss/15 px-2.5 py-1 text-xs font-semibold text-loss">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-loss opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-loss" />
          </span>
          Live
        </span>
        <h2 className="font-medium">In a game now</h2>
        <p className="font-mono text-xs text-faint">
          {queueName(game.queueId, game.gameMode)} ·{" "}
          {minutes === null ? "loading in" : `${minutes} min in`}
        </p>
        <p className="ml-auto text-[11px] text-faint max-md:hidden">
          Rank and win rate this season · mastery on the champion played
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {game.teams.map((team) => (
          <Team
            key={team.id}
            team={team}
            focusPuuid={focusPuuid}
            regionSlug={regionSlug}
            assetVersion={assetVersion}
            notes={notes}
          />
        ))}
      </div>
    </section>
  );
}
