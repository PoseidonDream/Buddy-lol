/** A made-up ladder for sample-data mode. Deterministic per region and queue. */

import type { ApexTier, LadderEntry, RankedQueue } from "../types";
import { Rng } from "./random";

const FIRST = [
  "Silent", "Lucky", "Greedy", "Sleepy", "Angry", "Tiny", "Brave", "Salty", "Frozen", "Golden",
  "Rapid", "Sneaky", "Wild", "Calm", "Turbo", "Mystic", "Rusty", "Royal", "Shadow", "Cosmic",
];
const SECOND = [
  "Poro", "Scuttle", "Minion", "Dragon", "Baron", "Herald", "Ward", "Krug", "Gromp", "Raptor",
  "Wolf", "Sentinel", "Brambleback", "Cannon", "Turret", "Nexus", "Inhibitor", "Bush", "River", "Lane",
];

const SIZE: Record<ApexTier, number> = { challenger: 300, grandmaster: 700, master: 2400 };
/** [lowest, highest] LP in each tier. */
const LP: Record<ApexTier, [number, number]> = {
  challenger: [980, 2150],
  grandmaster: [540, 979],
  master: [0, 539],
};

export type DemoLadderRow = Omit<LadderEntry, "position">;

const cache = new Map<string, DemoLadderRow[]>();

export function demoLadder(
  region: { slug: string; defaultTag: string },
  tier: ApexTier,
  queue: RankedQueue,
): DemoLadderRow[] {
  const key = `${region.slug}:${tier}:${queue}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const rng = new Rng(`ladder:${key}`);
  const [low, high] = LP[tier];
  const rows: DemoLadderRow[] = [];
  for (let i = 0; i < SIZE[tier]; i++) {
    const games = rng.int(180, 900);
    const wins = Math.round(games * rng.range(0.51, tier === "challenger" ? 0.62 : 0.58));
    // Skewed toward the bottom of the tier, as real ladders are.
    const lp = Math.round(low + (high - low) * rng.next() ** 2.2);
    const name = `${rng.pick(FIRST)} ${rng.pick(SECOND)}`;
    rows.push({
      puuid: `demo-ladder-${key}-${i}`,
      gameName: name,
      // Enough variety in tags that repeated names are still distinct players.
      tagLine: rng.chance(0.5) ? region.defaultTag : String(rng.int(1000, 9999)),
      lp,
      wins,
      losses: games - wins,
      hotStreak: rng.chance(0.15),
    });
  }
  rows.sort((a, b) => b.lp - a.lp);
  cache.set(key, rows);
  return rows;
}

/** If this sample player is on the solo ladder, where. */
export function demoLadderRank(
  region: { slug: string; defaultTag: string },
  gameName: string,
  tagLine: string,
): { tier: ApexTier; row: DemoLadderRow } | null {
  const name = gameName.toLowerCase();
  const tag = tagLine.toLowerCase();
  for (const tier of ["challenger", "grandmaster", "master"] as const) {
    const row = demoLadder(region, tier, "RANKED_SOLO_5x5").find(
      (r) => r.gameName?.toLowerCase() === name && r.tagLine?.toLowerCase() === tag,
    );
    if (row) return { tier, row };
  }
  return null;
}
