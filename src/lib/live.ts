import "server-only";

import { demoLiveGame } from "./demo/generate";
import { getStaticData } from "./ddragon";
import { getRegion } from "./regions";
import { getActiveGame } from "./riot/api";
import { RiotApiError } from "./riot/client";
import { mapLiveGame } from "./riot/mapper";
import type { LiveGame, Profile } from "./types";

/**
 * The game this player is in right now, or `null`. It is an extra on the
 * profile, so any failure here is reported as "not in a game" rather than
 * taking the page down.
 */
export async function getLiveGame(
  profile: Pick<Profile, "source" | "regionSlug" | "puuid" | "gameName" | "tagLine">,
): Promise<LiveGame | null> {
  const region = getRegion(profile.regionSlug);
  if (!region) return null;

  if (profile.source === "demo") {
    return demoLiveGame(region, profile.gameName, profile.tagLine, Date.now());
  }

  try {
    const [game, staticData] = await Promise.all([
      getActiveGame(region, profile.puuid),
      getStaticData(),
    ]);
    return game ? mapLiveGame(game, staticData.champion) : null;
  } catch (err) {
    if (err instanceof RiotApiError) return null;
    throw err;
  }
}
