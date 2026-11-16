/**
 * Server-side access to Data Dragon, Riot's static data CDN: which patch is
 * current, and which champion a numeric id refers to.
 */

import { CHAMPION_POOL, type ChampionInfo } from "./game-data";

const BASE = "https://ddragon.leagueoflegends.com";

/** Used for image URLs if the version list cannot be fetched. */
const FALLBACK_VERSION = "16.1.1";

const HALF_DAY = 60 * 60 * 12;

export interface StaticData {
  version: string;
  champion(id: number, apiName?: string): { key: string; name: string };
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: HALF_DAY },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

interface ChampionFile {
  data: Record<string, { id: string; key: string; name: string }>;
}

const FALLBACK_CHAMPIONS = new Map<number, ChampionInfo>(
  CHAMPION_POOL.map((c) => [c.id, { id: c.id, key: c.key, name: c.name }]),
);

export async function getStaticData(): Promise<StaticData> {
  const versions = await getJson<string[]>(`${BASE}/api/versions.json`);
  const version = versions?.[0] ?? FALLBACK_VERSION;

  const file = await getJson<ChampionFile>(
    `${BASE}/cdn/${version}/data/en_US/champion.json`,
  );
  const champions = new Map(FALLBACK_CHAMPIONS);
  for (const c of Object.values(file?.data ?? {})) {
    // In this file `key` is the numeric id and `id` is the string key.
    const id = Number(c.key);
    champions.set(id, { id, key: c.id, name: c.name });
  }

  return {
    version,
    champion(id, apiName) {
      const known = champions.get(id);
      if (known) return { key: known.key, name: known.name };
      // Not in our table: fall back to the name the match API reported, which
      // matches the Data Dragon key for every champion except this one.
      const key = apiName === "FiddleSticks" ? "Fiddlesticks" : apiName;
      return { key: key || String(id), name: key || `Champion ${id}` };
    },
  };
}
