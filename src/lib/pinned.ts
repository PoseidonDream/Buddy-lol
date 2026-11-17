import "server-only";

import { getStaticData } from "./ddragon";
import { demoLiveGame, demoRanked } from "./demo/generate";
import { rankValue } from "./rank-scale";
import { getRegion } from "./regions";
import { getAccountByPuuid, getActiveGame, getLeagueEntries, getSummoner } from "./riot/api";
import { riotApiKey } from "./riot/client";
import { mapRanked } from "./riot/mapper";
import { getStore } from "./store";
import type { PinnedPlayer, RankSnapshot } from "./store/types";
import type { RankedEntry } from "./types";

/** Players pinned at most, so the home page stays cheap in Riot requests. */
export const MAX_PINNED = 12;

const DAY = 24 * 60 * 60 * 1000;

export interface PinnedCard {
  puuid: string;
  regionSlug: string;
  gameName: string;
  tagLine: string;
  profileIconId: number | null;
  /** Solo rank, or flex for players with no solo rank. */
  rank: RankedEntry | null;
  /** Change in that queue over the last 24 hours; `null` with nothing to compare against. */
  today: { lp: number; wins: number; losses: number } | null;
  /** The game they're in right now. */
  live: { championKey: string; championName: string; queueId: number; startedAt: number | null } | null;
  /** Riot didn't answer for this player; the card shows the stored name only. */
  failed: boolean;
}

function splitRiotId(riotId: string): { gameName: string; tagLine: string } {
  const at = riotId.lastIndexOf("#");
  return at < 0 ? { gameName: riotId, tagLine: "" } : { gameName: riotId.slice(0, at), tagLine: riotId.slice(at + 1) };
}

export function mainRank(ranked: RankedEntry[]): RankedEntry | null {
  return ranked.find((r) => r.queue === "RANKED_SOLO_5x5") ?? ranked.find((r) => r.queue === "RANKED_FLEX_SR") ?? null;
}

/**
 * The change from the player's rank 24 hours ago to now. Snapshots are only
 * stored when the rank changes, so the rank at that moment is the last
 * snapshot before it; a player first seen since then is compared with that
 * first sighting.
 */
export function changeSince(
  history: Pick<RankSnapshot, "tier" | "division" | "lp" | "wins" | "losses" | "at">[],
  current: Pick<RankedEntry, "tier" | "division" | "lp" | "wins" | "losses">,
  since: number,
): PinnedCard["today"] {
  if (history.length === 0) return null;
  const before = history.filter((s) => s.at <= since).at(-1);
  const base = before ?? history.find((s) => s.at > since)!;
  const wins = current.wins - base.wins;
  const losses = current.losses - base.losses;
  // A new season resets the counts; there is nothing sensible to compare then.
  if (wins < 0 || losses < 0) return null;
  return {
    lp: Math.round(rankValue(current.tier, current.division, current.lp) - rankValue(base.tier, base.division, base.lp)),
    wins,
    losses,
  };
}

async function liveCard(pin: PinnedPlayer, now: number): Promise<{ card: PinnedCard; snapshots: RankSnapshot[] }> {
  const region = getRegion(pin.regionSlug)!;
  const [account, summoner, entries, game, staticData] = await Promise.allSettled([
    getAccountByPuuid(region, pin.puuid),
    getSummoner(region, pin.puuid),
    getLeagueEntries(region, pin.puuid),
    getActiveGame(region, pin.puuid),
    getStaticData(),
  ]);
  const value = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === "fulfilled" ? r.value : null);

  const name = value(account) ?? null;
  const ranked = mapRanked(value(entries) ?? []);
  const rank = mainRank(ranked);

  let today: PinnedCard["today"] = null;
  if (rank) {
    const history = await getStore()
      .rankHistory(pin.puuid, rank.queue, now - 8 * DAY)
      .catch(() => []);
    today = changeSince(history, rank, now - DAY);
  }

  let live: PinnedCard["live"] = null;
  const current = value(game);
  const data = value(staticData);
  const me = current?.participants.find((p) => p.puuid === pin.puuid);
  if (current && me && data) {
    const champion = data.champion(me.championId);
    live = {
      championKey: champion.key,
      championName: champion.name,
      queueId: current.gameQueueConfigId ?? 0,
      startedAt: current.gameStartTime ? current.gameStartTime : null,
    };
  }

  return {
    card: {
      puuid: pin.puuid,
      regionSlug: pin.regionSlug,
      ...(name?.gameName && name.tagLine
        ? { gameName: name.gameName, tagLine: name.tagLine }
        : splitRiotId(pin.riotId)),
      profileIconId: value(summoner)?.profileIconId ?? null,
      rank,
      today,
      live,
      failed: entries.status === "rejected",
    },
    snapshots: ranked.map((r) => ({
      puuid: pin.puuid,
      regionSlug: pin.regionSlug,
      queue: r.queue,
      tier: r.tier,
      division: r.division,
      lp: r.lp,
      wins: r.wins,
      losses: r.losses,
      at: now,
    })),
  };
}

function demoCard(pin: PinnedPlayer, now: number): PinnedCard {
  const region = getRegion(pin.regionSlug)!;
  const { gameName, tagLine } = splitRiotId(pin.riotId);
  const rank = mainRank(demoRanked(region, gameName, tagLine));
  const game = demoLiveGame(region, gameName, tagLine, now);
  const me = game?.teams.flatMap((t) => t.players).find((p) => p.gameName === gameName && p.tagLine === tagLine);
  return {
    puuid: pin.puuid,
    regionSlug: pin.regionSlug,
    gameName,
    tagLine,
    profileIconId: null,
    rank,
    today: null,
    live:
      game && me
        ? { championKey: me.championKey, championName: me.championName, queueId: game.queueId, startedAt: game.startedAt }
        : null,
    failed: false,
  };
}

/**
 * Cards for every pinned player: name, rank, the last day's LP, and whether
 * they're in a game. Also stores each rank it reads, which is what makes the
 * 24-hour change work for players nobody opens the profile of.
 */
export async function getPinnedCards(): Promise<{ cards: PinnedCard[]; at: number }> {
  const at = Date.now();
  const store = getStore();
  const pins = (await store.listPinned()).filter((p) => getRegion(p.regionSlug)).slice(0, MAX_PINNED);
  if (riotApiKey() === null) return { cards: pins.map((p) => demoCard(p, at)), at };

  const results = await Promise.all(pins.map((p) => liveCard(p, at)));
  await store.recordRanks(results.flatMap((r) => r.snapshots)).catch((err) => {
    console.warn("Could not record pinned players' ranks.", err);
  });
  return { cards: results.map((r) => r.card), at };
}
