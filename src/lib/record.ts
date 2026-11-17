import "server-only";

import { getStaticData } from "./ddragon";
import { riotApiKey } from "./riot/client";
import { matchDelta } from "./store/delta";
import { getStore } from "./store";
import type { MatchSummary, Profile } from "./types";

/**
 * Keep what a page has just fetched: the player's rank (for LP history) and
 * any ranked games (for champion statistics). Runs after the response is
 * sent, and never lets a storage problem surface to the visitor.
 */
export async function recordProfile(profile: Profile): Promise<void> {
  if (profile.source !== "live") return;
  try {
    const store = getStore();
    for (const entry of profile.ranked) {
      await store.recordRank({
        puuid: profile.puuid,
        regionSlug: profile.regionSlug,
        queue: entry.queue,
        tier: entry.tier,
        division: entry.division,
        lp: entry.lp,
        wins: entry.wins,
        losses: entry.losses,
        at: profile.generatedAt,
      });
    }
    await recordMatches(profile.matches);
  } catch (err) {
    console.warn("Could not record profile data.", err);
  }
}

export async function recordMatches(matches: MatchSummary[]): Promise<number> {
  // Sample games are made up; they must never reach real statistics.
  if (riotApiKey() === null) return 0;
  try {
    const store = getStore();
    const { isBuildItem } = await getStaticData();
    let added = 0;
    for (const match of matches) {
      const delta = matchDelta(match, isBuildItem);
      if (delta && (await store.recordMatch(delta))) added++;
    }
    return added;
  } catch (err) {
    console.warn("Could not record matches.", err);
    return 0;
  }
}
