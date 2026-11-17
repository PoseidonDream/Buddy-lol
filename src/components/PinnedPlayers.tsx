import Link from "next/link";
import { connection } from "next/server";
import { championIcon, profileIcon } from "@/lib/assets";
import { getStaticData } from "@/lib/ddragon";
import { initials } from "@/lib/format";
import { currentWriter, notesEnabled } from "@/lib/notes-auth";
import { getPinnedCards, type PinnedCard } from "@/lib/pinned";
import { formatRank } from "@/lib/rank-scale";
import { getRegion } from "@/lib/regions";
import { profilePath } from "@/lib/riot-id";
import { GameIcon } from "./GameIcon";
import { TierEmblem } from "./TierEmblem";

/**
 * Pinned players on the home page: rank, the last day's LP, and whether
 * they're in a game. Only for people who have unlocked notes.
 */
export async function PinnedPlayers() {
  await connection();
  if (!notesEnabled() || !(await currentWriter())) return null;

  let cards: PinnedCard[] = [];
  let now = 0;
  let failed = false;
  try {
    ({ cards, at: now } = await getPinnedCards());
  } catch (err) {
    console.warn("Could not load pinned players.", err);
    failed = true;
  }
  const { version } = await getStaticData();

  return (
    <section aria-labelledby="pinned-heading">
      <h2 id="pinned-heading" className="label-caps mb-3">
        Pinned players
      </h2>
      {failed ? (
        <p className="text-sm text-loss">Pinned players couldn&apos;t be loaded right now.</p>
      ) : cards.length === 0 ? (
        <p className="text-sm text-soft">
          Pin players from the notes box on their profile to keep an eye on them here.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <li key={card.puuid}>
              <Card card={card} version={version} now={now} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Card({ card, version, now }: { card: PinnedCard; version: string; now: number }) {
  const { rank, today, live } = card;
  const minutes = live?.startedAt ? Math.max(0, Math.floor((now - live.startedAt) / 60_000)) : null;
  const region = getRegion(card.regionSlug);

  return (
    <Link
      href={profilePath(card.regionSlug, { gameName: card.gameName, tagLine: card.tagLine })}
      className="card flex items-center gap-3 p-3 transition-colors hover:border-faint"
    >
      <div className="relative shrink-0">
        <GameIcon
          src={card.profileIconId === null ? null : profileIcon(version, card.profileIconId)}
          alt=""
          label={initials(card.gameName)}
          className="size-12 rounded-xl"
        />
        {live && (
          <span className="absolute -right-1 -top-1 flex size-3.5" title="In a game now">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-loss opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-3.5 rounded-full border-2 border-panel bg-loss" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-medium">
          {card.gameName}
          <span className="text-faint"> #{card.tagLine}</span>
          {region && region.slug !== "euw" && (
            <span className="ml-1.5 rounded bg-raised px-1 font-mono text-[10px] text-soft">{region.label}</span>
          )}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-sm">
          {rank ? (
            <>
              <TierEmblem tier={rank.tier} size={18} />
              <span>{formatRank(rank)}</span>
              {rank.queue === "RANKED_FLEX_SR" && <span className="text-xs text-faint">flex</span>}
            </>
          ) : (
            <span className="text-faint">{card.failed ? "Rank unavailable" : "Unranked"}</span>
          )}
        </div>
        <Today today={today} />
        {live && (
          <p className="mt-1 truncate text-xs font-medium text-loss">
            In game · {live.championName}
            {minutes !== null && ` · ${minutes} min`}
          </p>
        )}
      </div>

      {live && (
        <GameIcon
          src={championIcon(version, live.championKey)}
          alt={live.championName}
          label={initials(live.championName)}
          className="size-9 shrink-0 rounded-lg"
        />
      )}
    </Link>
  );
}

function Today({ today }: { today: PinnedCard["today"] }) {
  if (!today) return null;
  const games = today.wins + today.losses;
  if (games === 0 && today.lp === 0) {
    return <p className="mt-1 text-xs text-faint">No ranked games in the last 24h</p>;
  }
  const tone = today.lp > 0 ? "text-win" : today.lp < 0 ? "text-loss" : "text-soft";
  return (
    <p className="mt-1 text-xs text-faint">
      <span className={`font-mono font-semibold ${tone}`}>
        {today.lp > 0 ? "+" : today.lp < 0 ? "−" : "±"}
        {Math.abs(today.lp)} LP
      </span>
      {games > 0 && (
        <span className="font-mono">
          {" "}
          · {today.wins}W {today.losses}L
        </span>
      )}{" "}
      in the last 24h
    </p>
  );
}
