import "server-only";

import { createHash } from "node:crypto";
import { riotApiKey } from "./riot/client";
import { getStore } from "./store";

/**
 * Per-visitor limits on anything that costs Riot API requests: opening a
 * profile, a page of matches, a leaderboard page, a multi-search card.
 *
 * The Riot key's own limit is shared by every visitor, so without this one
 * person or bot could use it up for everyone. The defaults leave plenty of
 * room for someone clicking through profiles by hand.
 */
function limits() {
  const num = (value: string | undefined, fallback: number) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  };
  return [
    { windowMs: 60_000, max: num(process.env.RATE_LIMIT_PER_MINUTE, 10) },
    { windowMs: 60 * 60_000, max: num(process.env.RATE_LIMIT_PER_HOUR, 100) },
  ];
}

/**
 * The visitor's address. Vercel sets both headers itself and replaces any
 * value the browser sent, so they can't be forged there.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** Addresses are only ever stored as a one-way hash. */
function visitorKey(ip: string): string {
  const salt = process.env.RATE_LIMIT_SALT || process.env.CRON_SECRET || "buddy.lol";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
}

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export const LIMIT_MESSAGE =
  "You're looking up players faster than this site allows. Wait a minute, then try again.";

/**
 * Counts `cost` lookups for this visitor and says whether they may go ahead.
 * Sample-data mode costs nothing and is never limited. If the store fails,
 * the request is let through: a broken counter shouldn't break the site.
 */
export async function takeLookups(ip: string, cost = 1, now = Date.now()): Promise<LimitResult> {
  if (riotApiKey() === null) return { ok: true };
  const visitor = visitorKey(ip);
  try {
    const store = getStore();
    let retryAfterSec = 0;
    for (const { windowMs, max } of limits()) {
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const count = await store.countHits(`lookup:${visitor}:${windowMs}`, windowStart, cost);
      if (count > max) {
        retryAfterSec = Math.max(retryAfterSec, Math.ceil((windowStart + windowMs - now) / 1000));
      }
    }
    return retryAfterSec > 0 ? { ok: false, retryAfterSec } : { ok: true };
  } catch (err) {
    console.warn("Rate limiter unavailable; letting the request through.", err);
    return { ok: true };
  }
}
