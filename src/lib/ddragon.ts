/**
 * Server-side access to Data Dragon, Riot's static data CDN: which patch is
 * current, and which champion a numeric id refers to.
 */

import { DDRAGON_LOCALE, type Locale } from "@/i18n/config";
import { CHAMPION_POOL, ITEM_NAMES, RUNES, SPELLS, type ChampionInfo } from "./game-data";

const BASE = "https://ddragon.leagueoflegends.com";

/** Used for image URLs if the version list cannot be fetched. */
const FALLBACK_VERSION = "16.1.1";

const HALF_DAY = 60 * 60 * 12;

export interface StaticData {
  version: string;
  champion(id: number, apiName?: string): { key: string; name: string };
  /** Look a champion up by its Data Dragon key, ignoring case. */
  championByKey(key: string): ChampionInfo | undefined;
  /** Every champion we know of, by name. */
  champions(): ChampionInfo[];
  /** `undefined` for an item we have no name for. */
  itemName(id: number): string | undefined;
  /** Whether an item is part of a build (finished items and boots), not a component or consumable. */
  isBuildItem(id: number): boolean;
  /** A rune or rune tree's name and icon URL. */
  rune(id: number): NamedIcon | undefined;
  /** A summoner spell's name and icon URL. */
  spell(id: number): NamedIcon | undefined;
}

export interface NamedIcon {
  name: string;
  icon: string;
}

interface RuneTree {
  id: number;
  name: string;
  icon: string;
  slots: { runes: { id: number; name: string; icon: string }[] }[];
}

interface SpellFile {
  data: Record<string, { key: string; name: string; image?: { full?: string } }>;
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

interface ItemFile {
  data: Record<
    string,
    { name?: string; gold?: { total?: number }; tags?: string[]; into?: string[] }
  >;
}

/** Trinkets and the like, which every build has and which say nothing about it. */
const NOT_BUILD = new Set([2052, 3340, 3363, 3364]);

/** Finished items and boots, from Data Dragon's item list. */
function buildItemsFrom(file: ItemFile | null): Set<number> | null {
  if (!file) return null;
  const items = new Set<number>();
  for (const [id, item] of Object.entries(file.data)) {
    const tags = item.tags ?? [];
    if (tags.includes("Consumable") || tags.includes("Trinket")) continue;
    const boots = tags.includes("Boots") && (item.gold?.total ?? 0) >= 900;
    const finished = !item.into?.length && (item.gold?.total ?? 0) >= 2000;
    if (boots || finished) items.add(Number(id));
  }
  return items;
}

const FALLBACK_CHAMPIONS = new Map<number, ChampionInfo>(
  CHAMPION_POOL.map((c) => [c.id, { id: c.id, key: c.key, name: c.name }]),
);

/**
 * Static data with names in the given language. Data Dragon serves every
 * language from the same patch; the built-in English tables fill any gaps.
 */
export async function getStaticData(locale: Locale = "en"): Promise<StaticData> {
  const versions = await getJson<string[]>(`${BASE}/api/versions.json`);
  const version = versions?.[0] ?? FALLBACK_VERSION;

  const data = `${BASE}/cdn/${version}/data/${DDRAGON_LOCALE[locale]}`;
  const [file, itemFile, runeFile, spellFile] = await Promise.all([
    getJson<ChampionFile>(`${data}/champion.json`),
    getJson<ItemFile>(`${data}/item.json`),
    getJson<RuneTree[]>(`${data}/runesReforged.json`),
    getJson<SpellFile>(`${data}/summoner.json`),
  ]);

  const runes = new Map<number, NamedIcon>(
    Object.entries(RUNES).map(([id, r]) => [Number(id), { name: r.name, icon: `${BASE}/cdn/img/${r.icon}` }]),
  );
  for (const tree of runeFile ?? []) {
    runes.set(tree.id, { name: tree.name, icon: `${BASE}/cdn/img/${tree.icon}` });
    for (const slot of tree.slots) {
      for (const r of slot.runes) runes.set(r.id, { name: r.name, icon: `${BASE}/cdn/img/${r.icon}` });
    }
  }

  const spells = new Map<number, NamedIcon>(
    Object.entries(SPELLS).map(([id, s]) => [
      Number(id),
      { name: s.name, icon: `${BASE}/cdn/${version}/img/spell/${s.key}.png` },
    ]),
  );
  for (const s of Object.values(spellFile?.data ?? {})) {
    if (s.image?.full) {
      spells.set(Number(s.key), { name: s.name, icon: `${BASE}/cdn/${version}/img/spell/${s.image.full}` });
    }
  }

  const items = new Map<number, string>(
    Object.entries(ITEM_NAMES).map(([id, name]) => [Number(id), name]),
  );
  for (const [id, item] of Object.entries(itemFile?.data ?? {})) {
    if (item.name) items.set(Number(id), item.name);
  }

  const champions = new Map(FALLBACK_CHAMPIONS);
  for (const c of Object.values(file?.data ?? {})) {
    // In this file `key` is the numeric id and `id` is the string key.
    const id = Number(c.key);
    champions.set(id, { id, key: c.id, name: c.name });
  }

  const buildItems = buildItemsFrom(itemFile);

  const byKey = new Map([...champions.values()].map((c) => [c.key.toLowerCase(), c]));

  return {
    version,
    championByKey: (key) => byKey.get(key.toLowerCase()),
    champions: () => [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name)),
    itemName: (id) => items.get(id),
    rune: (id) => runes.get(id),
    spell: (id) => spells.get(id),
    isBuildItem: (id) =>
      buildItems ? buildItems.has(id) : id in ITEM_NAMES && !NOT_BUILD.has(id),
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
