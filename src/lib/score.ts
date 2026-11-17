/**
 * A 0-10 rating of each player's game, so games can be compared at a glance.
 * This is our own heuristic, not something Riot publishes: each stat is
 * measured against the best in that game, then weighted by role.
 */

import type { ParticipantSummary, TeamSummary } from "./types";

type Stat = "kda" | "killParticipation" | "damage" | "gold" | "cs" | "vision" | "damageTaken";

const STANDARD: Record<Stat, number> = {
  kda: 0.3,
  killParticipation: 0.2,
  damage: 0.25,
  gold: 0.1,
  cs: 0.05,
  vision: 0.05,
  damageTaken: 0.05,
};

// Supports are not judged on farm or raw damage; vision and being involved in
// kills count for more instead.
const SUPPORT: Record<Stat, number> = {
  kda: 0.3,
  killParticipation: 0.25,
  damage: 0.1,
  gold: 0.05,
  cs: 0,
  vision: 0.25,
  damageTaken: 0.05,
};

/** A KDA ratio at or above this earns full marks for that stat. */
const KDA_CEILING = 6;

function share(value: number, best: number): number | null {
  // A stat nobody registered (vision in ARAM) says nothing about anyone.
  return best > 0 ? value / best : null;
}

/**
 * Fills in `score`, `scoreRank` and `badge` on every participant, in place.
 * The best score on a winning team is the MVP, the best on a losing team the ACE.
 */
export function ratePlayers(teams: TeamSummary[]): void {
  const everyone = teams.flatMap((t) => t.participants);
  const best = (pick: (p: ParticipantSummary) => number) => Math.max(0, ...everyone.map(pick));
  const top = {
    damage: best((p) => p.damage),
    gold: best((p) => p.gold),
    cs: best((p) => p.cs),
    vision: best((p) => p.visionScore),
    damageTaken: best((p) => p.damageTaken),
  };

  for (const team of teams) {
    for (const p of team.participants) {
      const parts: Record<Stat, number | null> = {
        kda: Math.min(1, (p.kills + p.assists) / Math.max(1, p.deaths) / KDA_CEILING),
        killParticipation: team.kills > 0 ? Math.min(1, (p.kills + p.assists) / team.kills) : null,
        damage: share(p.damage, top.damage),
        gold: share(p.gold, top.gold),
        cs: share(p.cs, top.cs),
        vision: share(p.visionScore, top.vision),
        damageTaken: share(p.damageTaken, top.damageTaken),
      };

      const weights = p.position === "UTILITY" ? SUPPORT : STANDARD;
      let total = 0;
      let available = 0;
      for (const stat of Object.keys(weights) as Stat[]) {
        const value = parts[stat];
        if (value === null) continue;
        total += value * weights[stat];
        available += weights[stat];
      }
      p.score = available > 0 ? Math.round((total / available) * 100) / 10 : 0;
    }
  }

  const ranked = [...everyone].sort((a, b) => b.score - a.score);
  ranked.forEach((p, i) => {
    p.scoreRank = i + 1;
    p.badge = null;
  });
  const mvp = ranked.find((p) => p.win);
  const ace = ranked.find((p) => !p.win);
  if (mvp) mvp.badge = "MVP";
  if (ace) ace.badge = "ACE";
}
