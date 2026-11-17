"use client";

import Link from "next/link";
import { useDict } from "@/i18n/client";
import { itemIcon, runeIcon, spellIcon } from "@/lib/assets";
import { RUNES, SPELLS } from "@/lib/game-data";
import { profilePath } from "@/lib/riot-id";
import type { ItemNames, ParticipantSummary } from "@/lib/types";
import { GameIcon } from "../GameIcon";

export function ItemRow({
  items,
  itemNames,
  assetVersion,
  size = "size-7",
}: {
  items: number[];
  itemNames: ItemNames;
  assetVersion: string;
  size?: string;
}) {
  return (
    <ul className="flex gap-0.5">
      {items.map((item, slot) => (
        <li key={slot} className={slot === 6 ? "ml-1" : undefined}>
          {item > 0 ? (
            <GameIcon
              src={itemIcon(assetVersion, item)}
              alt={itemNames[item] ?? ""}
              className={`${size} ${slot === 6 ? "rounded-full" : "rounded"}`}
            />
          ) : (
            <span
              className={`block ${size} ${slot === 6 ? "rounded-full" : "rounded"} bg-ink/50`}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The player's score for the game and where it ranks. Renders nothing for a
 * remake, where nobody is scored.
 */
export function ScoreBadge({ player }: { player: ParticipantSummary }) {
  const t = useDict();
  if (player.scoreRank === 0) return null;
  const tone =
    player.badge === "MVP"
      ? "bg-gold/15 text-gold"
      : player.badge === "ACE"
        ? "bg-accent/15 text-accent"
        : "bg-white/5 text-soft";
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-xs"
      title={t.match.scoreTitle}
    >
      <span className="tabular-nums text-fg">{player.score.toFixed(1)}</span>
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}>
        {player.badge ?? t.match.scoreRank(player.scoreRank)}
      </span>
    </span>
  );
}

export function Loadout({
  player,
  assetVersion,
  size = "size-6",
}: {
  player: Pick<ParticipantSummary, "spells" | "keystone" | "secondaryStyle">;
  assetVersion: string;
  size?: string;
}) {
  const tiles = [
    ...player.spells.map((id) => ({
      src: spellIcon(assetVersion, id),
      name: SPELLS[id]?.name ?? "",
      round: false,
    })),
    { src: runeIcon(player.keystone), name: RUNES[player.keystone ?? 0]?.name ?? "", round: true },
    {
      src: runeIcon(player.secondaryStyle),
      name: RUNES[player.secondaryStyle ?? 0]?.name ?? "",
      round: true,
    },
  ];
  // Column-major: spells on the left, runes on the right.
  return (
    <div className="grid grid-flow-col grid-rows-2 gap-0.5">
      {tiles.map((tile, i) => (
        <GameIcon
          key={i}
          src={tile.src}
          alt={tile.name}
          label={tile.name.slice(0, 1)}
          className={`${size} ${tile.round ? "rounded-full bg-ink/60" : "rounded"}`}
        />
      ))}
    </div>
  );
}

export function PlayerLink({
  player,
  regionSlug,
  className = "",
}: {
  player: Pick<ParticipantSummary, "gameName" | "tagLine">;
  regionSlug: string;
  className?: string;
}) {
  // Bots and very old matches have no tagline, so there is nothing to link to.
  if (!player.tagLine) return <span className={className}>{player.gameName}</span>;
  return (
    <Link
      href={profilePath(regionSlug, player)}
      prefetch={false}
      className={`${className} rounded-sm hover:underline`}
      title={`${player.gameName}#${player.tagLine}`}
    >
      {player.gameName}
    </Link>
  );
}
