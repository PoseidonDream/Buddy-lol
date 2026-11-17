import "server-only";

import { demoLadder } from "./demo/ladder";
import { isDemoMode } from "./profile";
import { getRegion, type Region } from "./regions";
import { getAccountByPuuid, getApexLeague } from "./riot/api";
import { RiotApiError } from "./riot/client";
import type {
  ApexTier,
  LadderEntry,
  LadderPage,
  ProfileError,
  RankedQueue,
  Result,
} from "./types";

export const LADDER_PAGE_SIZE = 25;
export const APEX_TIERS: ApexTier[] = ["challenger", "grandmaster", "master"];

const LADDER_TTL_MS = 10 * 60_000;

type Row = Omit<LadderEntry, "position" | "gameName" | "tagLine">;

/**
 * Sorted ladders, kept in memory. A Master list can run to several megabytes,
 * which is more than the fetch cache will hold, and we only need five fields
 * from each entry anyway.
 */
const ladders = new Map<string, { expires: number; rows: Row[] }>();

async function loadLadder(region: Region, tier: ApexTier, queue: RankedQueue): Promise<Row[]> {
  const key = `${region.slug}:${tier}:${queue}`;
  const cached = ladders.get(key);
  if (cached && cached.expires > Date.now()) return cached.rows;

  const league = await getApexLeague(region, tier, queue);
  const rows: Row[] = [];
  for (const e of league?.entries ?? []) {
    if (!e.puuid) continue;
    rows.push({
      puuid: e.puuid,
      lp: e.leaguePoints,
      wins: e.wins,
      losses: e.losses,
      hotStreak: Boolean(e.hotStreak),
    });
  }
  rows.sort((a, b) => b.lp - a.lp);
  ladders.set(key, { expires: Date.now() + LADDER_TTL_MS, rows });
  return rows;
}

/** Look up names a few at a time; a row whose lookup fails keeps a blank name. */
async function withNames(region: Region, rows: Row[], firstPosition: number): Promise<LadderEntry[]> {
  const entries: LadderEntry[] = rows.map((row, i) => ({
    ...row,
    position: firstPosition + i,
    gameName: null,
    tagLine: null,
  }));

  let next = 0;
  let limited = false;
  const worker = async () => {
    while (next < entries.length && !limited) {
      const entry = entries[next++];
      try {
        const account = await getAccountByPuuid(region, entry.puuid);
        entry.gameName = account?.gameName ?? null;
        entry.tagLine = account?.tagLine ?? null;
      } catch (err) {
        if (!(err instanceof RiotApiError)) throw err;
        // Once rate limited, further lookups would only dig the hole deeper.
        if (err.status === 429) limited = true;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, entries.length) }, worker));
  return entries;
}

function fail(kind: ProfileError["kind"], message: string): Result<LadderPage> {
  return { ok: false, error: { kind, message } };
}

export async function getLadder(
  regionSlug: string,
  tier: ApexTier,
  queue: RankedQueue,
  page: number,
): Promise<Result<LadderPage>> {
  const region = getRegion(regionSlug);
  if (!region) return fail("invalid", "That region doesn't exist.");

  const demo = isDemoMode();
  try {
    const rows: Row[] = demo ? demoLadder(region, tier, queue) : await loadLadder(region, tier, queue);

    const lastPage = Math.max(1, Math.ceil(rows.length / LADDER_PAGE_SIZE));
    const current = Math.min(Math.max(1, page), lastPage);
    const from = (current - 1) * LADDER_PAGE_SIZE;
    const slice = rows.slice(from, from + LADDER_PAGE_SIZE);

    const entries: LadderEntry[] = demo
      ? demoLadder(region, tier, queue)
          .slice(from, from + LADDER_PAGE_SIZE)
          .map((row, i) => ({ ...row, position: from + 1 + i }))
      : await withNames(region, slice, from + 1);

    return {
      ok: true,
      data: {
        source: demo ? "demo" : "live",
        regionSlug: region.slug,
        tier,
        queue,
        page: current,
        pageSize: LADDER_PAGE_SIZE,
        total: rows.length,
        entries,
      },
    };
  } catch (err) {
    if (!(err instanceof RiotApiError)) throw err;
    if (err.status === 429) {
      return fail("rate_limited", "We're asking Riot for too much at once. Give it a minute and try again.");
    }
    if (err.status === 401 || err.status === 403) {
      return fail("auth", "Riot rejected the API key. Development keys expire after 24 hours, so it may need replacing.");
    }
    return fail("upstream", "Riot's servers didn't answer properly. Try again in a moment.");
  }
}
