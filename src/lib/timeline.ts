import "server-only";

import { dictionaries } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

import { getStaticData } from "./ddragon";
import { demoTimeline } from "./demo/generate";
import { describeRiotError, isDemoMode } from "./profile";
import { getRegion } from "./regions";
import { riotIdFromSlug } from "./riot-id";
import { getTimeline } from "./riot/api";
import { mapTimeline } from "./riot/mapper";
import type { MatchTimeline, Result } from "./types";

/** Riot match ids look like "EUW1_7234567890"; sample ones like "DEMO_abc123_4". */
export function isMatchId(id: string): boolean {
  return /^[A-Za-z0-9]{2,12}_[A-Za-z0-9_]{1,30}$/.test(id);
}

/**
 * The timeline of one finished match. `player` (the profile's "Name-TAG")
 * is only needed in sample-data mode, where games are rebuilt from it.
 */
export async function getMatchTimeline(
  regionSlug: string,
  matchId: string,
  player: string | null,
  locale: Locale = "en",
): Promise<Result<MatchTimeline>> {
  const t = dictionaries[locale].errors;
  const region = getRegion(regionSlug);
  if (!region || !isMatchId(matchId)) {
    return { ok: false, error: { kind: "invalid", message: t.noMatch } };
  }

  if (isDemoMode()) {
    const id = player ? riotIdFromSlug(player) : null;
    const timeline = id ? demoTimeline(region, id.gameName, id.tagLine, matchId, Date.now()) : null;
    return timeline
      ? { ok: true, data: timeline }
      : { ok: false, error: { kind: "not_found", message: t.noTimeline } };
  }

  try {
    const [dto, staticData] = await Promise.all([getTimeline(region, matchId), getStaticData(locale)]);
    if (!dto) return { ok: false, error: { kind: "not_found", message: t.noTimeline } };
    const timeline = mapTimeline(dto, matchId);
    const itemNames: MatchTimeline["itemNames"] = {};
    for (const p of timeline.players) {
      for (const { itemId } of p.purchases) {
        const name = staticData.itemName(itemId);
        if (name) itemNames[itemId] = name;
      }
    }
    return { ok: true, data: { ...timeline, itemNames } };
  } catch (err) {
    return describeRiotError(err, locale);
  }
}
