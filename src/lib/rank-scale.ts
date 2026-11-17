/**
 * Ranks as one number, so they can be plotted and compared: 100 points per
 * division, 400 per tier, Iron IV 0 LP at zero. Master and above share one
 * open-ended band, because their LP simply keeps counting.
 */

import { APEX_TIERS, TIERS, tierName } from "./game-data";
import type { Tier } from "./types";

const DIVISIONS = ["IV", "III", "II", "I"];
export const APEX_FLOOR = 7 * 400;

export function rankValue(tier: Tier, division: string, lp: number): number {
  const t = TIERS.indexOf(tier);
  if (t >= 7) return APEX_FLOOR + lp;
  const d = Math.max(0, DIVISIONS.indexOf(division));
  return t * 400 + d * 100 + Math.min(100, Math.max(0, lp));
}

export interface RankPoint {
  tier: Tier;
  division: string;
  lp: number;
}

/**
 * The inverse of rankValue. Above the apex floor the tier can't be recovered
 * from the number alone, so `apexTier` (the player's current one) is used.
 */
export function rankFromValue(value: number, apexTier: Tier = "MASTER"): RankPoint {
  const v = Math.max(0, Math.round(value));
  if (v >= APEX_FLOOR) {
    return { tier: APEX_TIERS.has(apexTier) ? apexTier : "MASTER", division: "I", lp: v - APEX_FLOOR };
  }
  const tier = TIERS[Math.floor(v / 400)];
  const rest = v % 400;
  return { tier, division: DIVISIONS[Math.floor(rest / 100)], lp: rest % 100 };
}

export function formatRank({ tier, division, lp }: RankPoint): string {
  return `${tierName(tier)}${APEX_TIERS.has(tier) ? "" : ` ${division}`} · ${lp} LP`;
}

/** Name of the band that starts at a gridline value: "Gold", or "Gold II" for a division line. */
export function bandName(value: number, divisions: boolean): string {
  if (value >= APEX_FLOOR) return "Master";
  const { tier, division } = rankFromValue(value);
  return divisions ? `${tierName(tier)} ${division}` : tierName(tier);
}
