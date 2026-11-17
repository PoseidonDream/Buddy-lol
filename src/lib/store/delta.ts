/** Turning a finished match into what it adds to the champion statistics. */

import type { MatchSummary } from "../types";
import type { MatchDelta } from "./types";

/** Only ranked solo games feed the statistics: one queue, one meaning of "good". */
export const STATS_QUEUE = 420;

/**
 * `null` for games that should not be counted: other queues, remakes,
 * games with no patch or with players missing a position.
 */
export function matchDelta(
  match: MatchSummary,
  isBuildItem: (itemId: number) => boolean,
): MatchDelta | null {
  if (match.queueId !== STATS_QUEUE || match.remake || !match.patch) return null;
  const players = match.teams.flatMap((t) => t.participants);
  if (players.length !== 10 || players.some((p) => !p.position)) return null;

  const delta: MatchDelta = {
    matchId: match.id,
    patch: match.patch,
    champions: [],
    bans: [...new Set(match.teams.flatMap((t) => t.bans))],
    picks: [],
    matchups: [],
  };

  // Lane opponents: the two players in the same position on opposite teams.
  const [blue, red] = match.teams.map((t) => t.participants);
  if (blue?.length === 5 && red?.length === 5) {
    for (const b of blue) {
      const r = red.find((p) => p.position === b.position);
      if (!r) continue;
      delta.matchups.push(
        { champion: b.championKey, position: b.position!, opponent: r.championKey, win: b.win },
        { champion: r.championKey, position: r.position!, opponent: b.championKey, win: r.win },
      );
    }
  }

  for (const p of players) {
    delta.champions.push({ champion: p.championKey, position: p.position!, win: p.win });
    const pick = (kind: MatchDelta["picks"][number]["kind"], choice: string) =>
      delta.picks.push({ champion: p.championKey, kind, choice, win: p.win });

    for (const item of new Set(p.items.slice(0, 6))) {
      if (item > 0 && isBuildItem(item)) pick("item", String(item));
    }
    if (p.keystone) pick("keystone", String(p.keystone));
    if (p.secondaryStyle) pick("secondary", String(p.secondaryStyle));
    // Flash on D or F is the same choice; store the pair in one order.
    const spells = [...p.spells].filter((s) => s > 0).sort((a, b) => a - b);
    if (spells.length === 2) pick("spells", spells.join("+"));
  }
  return delta;
}
