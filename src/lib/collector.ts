import "server-only";

import { getStaticData } from "./ddragon";
import { Rng } from "./demo/random";
import { getRegion } from "./regions";
import { MAX_PINNED } from "./pinned";
import { getApexLeague, getLeagueEntries, getMatch, getMatchIds } from "./riot/api";
import { RiotApiError } from "./riot/client";
import { mapMatch, mapRanked } from "./riot/mapper";
import { matchDelta } from "./store/delta";
import { getStore } from "./store";
import type { RankSnapshot } from "./store/types";
import type { ApexTier } from "./types";

export interface CollectReport {
  region: string;
  /** Riot API calls made (cached answers count too, to stay on the safe side). */
  requests: number;
  ranksRecorded: number;
  playersVisited: number;
  matchesAdded: number;
  /** Players or games skipped because Riot couldn't serve them. */
  skipped: number;
  stoppedBecause: "budget" | "time" | "rate_limited" | "done";
}

/** A rate limit or a rejected key affects every call; anything else only that one. */
function isFatal(err: unknown): boolean {
  return err instanceof RiotApiError && [401, 403, 429].includes(err.status);
}

/** Games looked at per player visited. */
const GAMES_PER_PLAYER = 20;

/**
 * Gathers ranked solo games from the top of one region's ladder, for the
 * champion statistics, and saves every ladder player's rank for LP history.
 *
 * `budget` caps the Riot requests one run may make: a development key allows
 * 100 every two minutes, so a run every few minutes at 80 stays clear of it.
 */
export async function collect(
  regionSlug: string,
  { budget = 80, timeLimitMs = 50_000 }: { budget?: number; timeLimitMs?: number } = {},
): Promise<CollectReport> {
  const region = getRegion(regionSlug);
  if (!region) throw new Error(`Unknown region "${regionSlug}"`);

  const started = Date.now();
  const store = getStore();
  const { champion, isBuildItem } = await getStaticData();
  const report: CollectReport = {
    region: region.slug,
    requests: 0,
    ranksRecorded: 0,
    playersVisited: 0,
    matchesAdded: 0,
    skipped: 0,
    stoppedBecause: "done",
  };

  const spend = () => {
    if (report.requests >= budget) {
      report.stoppedBecause = "budget";
      return false;
    }
    if (Date.now() - started > timeLimitMs) {
      report.stoppedBecause = "time";
      return false;
    }
    report.requests++;
    return true;
  };

  try {
    // Pinned players first: a request each keeps their 24-hour LP change on
    // the home page accurate even when nobody opens their profile.
    const pins = (await store.listPinned()).filter((p) => p.regionSlug === region.slug).slice(0, MAX_PINNED);
    const pinned: RankSnapshot[] = [];
    for (const pin of pins) {
      if (!spend()) break;
      try {
        const at = Date.now();
        for (const r of mapRanked((await getLeagueEntries(region, pin.puuid)) ?? [])) {
          const { queue, tier, division, lp, wins, losses } = r;
          pinned.push({ puuid: pin.puuid, regionSlug: region.slug, queue, tier, division, lp, wins, losses, at });
        }
      } catch (err) {
        if (isFatal(err)) throw err;
        report.skipped++;
      }
    }
    await store.recordRanks(pinned);
    report.ranksRecorded += pinned.length;

    const players: string[] = [];
    for (const tier of ["challenger", "grandmaster"] as ApexTier[]) {
      if (!spend()) return report;
      const league = await getApexLeague(region, tier, "RANKED_SOLO_5x5");
      const at = Date.now();
      const snapshots: RankSnapshot[] = [];
      for (const e of league?.entries ?? []) {
        if (!e.puuid) continue;
        players.push(e.puuid);
        snapshots.push({
          puuid: e.puuid,
          regionSlug: region.slug,
          queue: "RANKED_SOLO_5x5",
          tier: tier.toUpperCase() as "CHALLENGER" | "GRANDMASTER",
          division: "I",
          lp: e.leaguePoints,
          wins: e.wins,
          losses: e.losses,
          at,
        });
      }
      // One write for the whole list: a Challenger and Grandmaster ladder is
      // about a thousand players.
      await store.recordRanks(snapshots);
      report.ranksRecorded += snapshots.length;
    }

    // A different slice of the ladder each run, so repeated runs spread out.
    const order = new Rng(`${region.slug}:${Math.floor(Date.now() / 600_000)}`).shuffle(players);
    for (const puuid of order) {
      if (!spend()) return report;
      report.playersVisited++;
      let ids: string[];
      try {
        ids = (await getMatchIds(region, puuid, 0, GAMES_PER_PLAYER, "solo")) ?? [];
      } catch (err) {
        if (isFatal(err)) throw err;
        report.skipped++;
        continue;
      }
      const seen = await store.seenMatches(ids);

      for (const id of ids) {
        if (seen.has(id)) continue;
        if (!spend()) return report;
        try {
          const dto = await getMatch(region, id);
          const match = dto ? mapMatch(dto, puuid, champion) : null;
          const delta = match ? matchDelta(match, isBuildItem) : null;
          if (delta && (await store.recordMatch(delta))) report.matchesAdded++;
        } catch (err) {
          if (isFatal(err)) throw err;
          report.skipped++;
        }
      }
    }
    return report;
  } catch (err) {
    if (err instanceof RiotApiError && err.status === 429) {
      report.stoppedBecause = "rate_limited";
      return report;
    }
    throw err;
  }
}
