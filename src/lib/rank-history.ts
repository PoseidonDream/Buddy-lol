import "server-only";

import type { Locale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { Rng } from "./demo/random";
import { formatRank, rankFromValue, rankValue } from "./rank-scale";
import { getStore } from "./store";
import type { Profile, RankedEntry, RankHistory, RankHistoryPoint } from "./types";

const DAY = 24 * 60 * 60 * 1000;
export const HISTORY_DAYS = 90;

function point(
  at: number,
  entry: Pick<RankedEntry, "tier" | "division" | "lp">,
  locale: Locale = "en",
): RankHistoryPoint {
  return {
    at,
    value: rankValue(entry.tier, entry.division, entry.lp),
    label: formatRank(entry, dictionaries[locale].game.tier),
  };
}

/** The queue to chart: solo if the player has a solo rank, flex otherwise. */
function chartedEntry(profile: Profile): RankedEntry | undefined {
  return profile.ranked.find((r) => r.queue === "RANKED_SOLO_5x5") ?? profile.ranked[0];
}

/**
 * A believable climb or slide ending at the player's current rank: one point
 * per game over about two months, walked backwards from today.
 */
function demoHistory(profile: Profile, entry: RankedEntry, locale: Locale): RankHistoryPoint[] {
  const rng = new Rng(`${profile.puuid}:history:${entry.queue}`);
  const winRate = entry.wins / Math.max(1, entry.wins + entry.losses);
  const games = rng.int(28, 60);

  let value = rankValue(entry.tier, entry.division, entry.lp);
  let at = profile.generatedAt;
  const points: RankHistoryPoint[] = [point(at, entry, locale)];
  for (let i = 0; i < games; i++) {
    // Undo one game: a win had added LP, a loss had taken it away.
    value = Math.max(0, value - (rng.chance(winRate) ? rng.int(15, 24) : -rng.int(14, 22)));
    at -= rng.range(0.25, 2.2) * DAY;
    points.push(point(at, rankFromValue(value, entry.tier), locale));
  }
  return points.reverse();
}

export async function getRankHistory(profile: Profile, locale: Locale = "en"): Promise<RankHistory | null> {
  const entry = chartedEntry(profile);
  if (!entry) return null;

  if (profile.source === "demo") {
    return { queue: entry.queue, points: demoHistory(profile, entry, locale), source: "demo" };
  }

  let points: RankHistoryPoint[] = [];
  try {
    const since = profile.generatedAt - HISTORY_DAYS * DAY;
    const snapshots = await getStore().rankHistory(profile.puuid, entry.queue, since);
    points = snapshots.map((s) => point(s.at, s, locale));
  } catch (err) {
    console.warn("Could not read rank history.", err);
  }

  // Today's rank, unless the latest snapshot already says the same.
  const now = point(profile.generatedAt, entry, locale);
  if (points.at(-1)?.value !== now.value) points.push(now);
  return { queue: entry.queue, points, source: "live" };
}
