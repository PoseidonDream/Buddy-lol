"use client";

import { championIcon } from "@/lib/assets";
import { queueName } from "@/lib/game-data";
import type { LiveGame, LiveTeam } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { GameIcon } from "../GameIcon";
import { initials } from "@/lib/format";
import { Loadout, PlayerLink } from "./MatchParts";

function Team({
  team,
  focusPuuid,
  regionSlug,
  assetVersion,
}: {
  team: LiveTeam;
  focusPuuid: string;
  regionSlug: string;
  assetVersion: string;
}) {
  const blue = team.id === 100;
  return (
    <div>
      <h3 className={`mb-2 text-xs font-semibold ${blue ? "text-win" : "text-loss"}`}>
        {blue ? "Blue side" : "Red side"}
      </h3>
      <ul className="space-y-1.5">
        {team.players.map((p, i) => {
          const focused = p.puuid !== null && p.puuid === focusPuuid;
          return (
            <li
              key={p.puuid ?? i}
              className={`flex items-center gap-2 rounded-lg px-1.5 py-1 ${focused ? "bg-white/5" : ""}`}
            >
              <GameIcon
                src={championIcon(assetVersion, p.championKey)}
                alt={p.championName}
                label={initials(p.championName)}
                className="size-8 rounded-lg"
              />
              <Loadout player={p} assetVersion={assetVersion} size="size-4" />
              <PlayerLink
                player={p}
                regionSlug={regionSlug}
                className={`min-w-0 truncate text-sm ${focused ? "font-semibold" : "text-soft"}`}
              />
            </li>
          );
        })}
      </ul>
      {team.bans.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
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
  );
}

export function LiveGameCard({
  game,
  focusPuuid,
  regionSlug,
  assetVersion,
  fetchedAt,
}: {
  game: LiveGame;
  /** The player whose profile this is, highlighted in the list. */
  focusPuuid: string;
  regionSlug: string;
  assetVersion: string;
  fetchedAt: number;
}) {
  const now = useNow(fetchedAt);
  const minutes = game.startedAt === null ? null : Math.max(0, Math.floor((now - game.startedAt) / 60_000));

  return (
    <section className="card p-5" aria-label="Live game">
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
      </div>

      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {game.teams.map((team) => (
          <Team
            key={team.id}
            team={team}
            focusPuuid={focusPuuid}
            regionSlug={regionSlug}
            assetVersion={assetVersion}
          />
        ))}
      </div>
    </section>
  );
}
