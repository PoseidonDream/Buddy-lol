import type { ItemNames, MatchSummary } from "./types";

/** Look up a name for every item that appears in these matches. */
export function collectItemNames(
  matches: MatchSummary[],
  nameOf: (itemId: number) => string | undefined,
): ItemNames {
  const names: ItemNames = {};
  for (const match of matches) {
    for (const team of match.teams) {
      for (const player of team.participants) {
        for (const item of player.items) {
          if (item === 0 || item in names) continue;
          const name = nameOf(item);
          if (name) names[item] = name;
        }
      }
    }
  }
  return names;
}
