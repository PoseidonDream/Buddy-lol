import "server-only";

import type { Locale } from "@/i18n/config";

import { demoLiveGame } from "./demo/generate";
import { getStaticData } from "./ddragon";
import { getRegion, type Region } from "./regions";
import { getActiveGame, getChampionMastery, getLeagueEntries } from "./riot/api";
import { RiotApiError } from "./riot/client";
import { mapLiveGame, mapRanked } from "./riot/mapper";
import type { LiveGame, LivePlayer, Profile } from "./types";

/**
 * The game this player is in right now, or `null`. It is an extra on the
 * profile, so any failure here is reported as "not in a game" rather than
 * taking the page down.
 */
export async function getLiveGame(
  profile: Pick<Profile, "source" | "regionSlug" | "puuid" | "gameName" | "tagLine">,
  locale: Locale = "en",
): Promise<LiveGame | null> {
  const region = getRegion(profile.regionSlug);
  if (!region) return null;

  if (profile.source === "demo") {
    return demoLiveGame(region, profile.gameName, profile.tagLine, Date.now());
  }

  try {
    const [game, staticData] = await Promise.all([
      getActiveGame(region, profile.puuid),
      getStaticData(locale),
    ]);
    if (!game) return null;
    const live = mapLiveGame(game, staticData.champion);
    await addRanksAndMastery(region, live.teams.flatMap((t) => t.players));
    return live;
  } catch (err) {
    if (err instanceof RiotApiError) return null;
    throw err;
  }
}

/**
 * Each player's rank and their mastery on the champion they picked: two
 * requests per player, a few players at a time. A player whose lookups fail
 * just shows without them. After a rate limit the rest are skipped, so the
 * game still shows.
 */
async function addRanksAndMastery(region: Region, players: LivePlayer[]): Promise<void> {
  const queue = players.filter((p) => p.puuid);
  let limited = false;

  const worker = async () => {
    while (queue.length && !limited) {
      const player = queue.shift()!;
      const puuid = player.puuid!;
      const [entries, mastery] = await Promise.allSettled([
        getLeagueEntries(region, puuid),
        getChampionMastery(region, puuid, player.championId),
      ]);

      for (const result of [entries, mastery]) {
        if (result.status === "rejected") {
          if (!(result.reason instanceof RiotApiError)) throw result.reason;
          if (result.reason.status === 429) limited = true;
        }
      }
      if (entries.status === "fulfilled") {
        const ranked = mapRanked(entries.value ?? []);
        player.rank = ranked.find((r) => r.queue === "RANKED_SOLO_5x5") ?? ranked[0] ?? null;
      }
      if (mastery.status === "fulfilled" && mastery.value) {
        player.mastery = {
          level: mastery.value.championLevel,
          points: mastery.value.championPoints,
        };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
}
