/** The words relative times and durations are written with, per language. */
export interface TimeLabels {
  justNow: string;
  minutesAgo(n: number): string;
  hoursAgo(n: number): string;
  daysAgo(n: number): string;
  monthsAgo(n: number): string;
  yearsAgo(n: number): string;
  duration(minutes: number, seconds: number): string;
  longDuration(hours: number, minutes: number): string;
}

const ENGLISH_TIME: TimeLabels = {
  justNow: "just now",
  minutesAgo: (n) => `${n}m ago`,
  hoursAgo: (n) => `${n}h ago`,
  daysAgo: (n) => `${n}d ago`,
  monthsAgo: (n) => `${n}mo ago`,
  yearsAgo: (n) => `${n}y ago`,
  duration: (m, s) => `${m}m ${String(s).padStart(2, "0")}s`,
  longDuration: (h, m) => `${h}h ${String(m).padStart(2, "0")}m`,
};

export function formatDuration(seconds: number, labels: TimeLabels = ENGLISH_TIME): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m >= 60) return labels.longDuration(Math.floor(m / 60), m % 60);
  return labels.duration(m, s);
}

/**
 * Relative time against an explicit `now`, so the server and the browser
 * render the same string.
 */
export function timeAgo(timestamp: number, now: number, labels: TimeLabels = ENGLISH_TIME): string {
  const sec = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (sec < 60) return labels.justNow;
  const min = Math.floor(sec / 60);
  if (min < 60) return labels.minutesAgo(min);
  const hours = Math.floor(min / 60);
  if (hours < 24) return labels.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  if (days < 30) return labels.daysAgo(days);
  const months = Math.floor(days / 30);
  if (months < 12) return labels.monthsAgo(months);
  return labels.yearsAgo(Math.floor(months / 12));
}

/** (K + A) / D. `null` when there were no deaths (a "perfect" KDA). */
export function kdaRatio(kills: number, deaths: number, assists: number): number | null {
  return deaths === 0 ? null : (kills + assists) / deaths;
}

export function formatKda(ratio: number | null): string {
  return ratio === null ? "Perfect" : ratio.toFixed(2);
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** 1 -> "1st", 22 -> "22nd". */
export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens > 10 && tens < 14 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}

export const MULTI_KILL_NAMES: Record<number, string> = {
  2: "Double kill",
  3: "Triple kill",
  4: "Quadra kill",
  5: "Penta kill",
};

/** "Lee Sin" -> "LS", "Ahri" -> "AH". Shown when an image cannot load. */
export function initials(name: string): string {
  const words = name.split(/[\s']+/).filter(Boolean);
  return words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}
