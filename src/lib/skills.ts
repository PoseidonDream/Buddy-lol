export const SKILL_KEYS = ["Q", "W", "E", "R"];

/** "Q > E > W": the basic abilities in the order they were maxed (or most levelled). */
export function maxOrder(skills: number[]): string {
  const reached = new Map<number, { points: number; at: number }>();
  skills.forEach((slot, i) => {
    if (slot === 4) return;
    const entry = reached.get(slot) ?? { points: 0, at: 0 };
    entry.points++;
    entry.at = i;
    reached.set(slot, entry);
  });
  return [...reached]
    .sort((a, b) => b[1].points - a[1].points || a[1].at - b[1].at)
    .map(([slot]) => SKILL_KEYS[slot - 1])
    .join(" > ");
}
