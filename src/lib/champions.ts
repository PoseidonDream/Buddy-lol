import "server-only";

import { getStaticData } from "./ddragon";
import { demoMatches } from "./demo/generate";
import { demoLadder } from "./demo/ladder";
import { ITEM_NAMES, POSITIONS } from "./game-data";
import { riotApiKey } from "./riot/client";
import { matchDelta } from "./store/delta";
import { getStore } from "./store";
import { MemoryStore } from "./store/memory";
import type { ChampionDetail, PickKind, Store } from "./store/types";
import type { Position } from "./types";

export type Tier = "S" | "A" | "B" | "C" | "D";

export interface TierRow {
  championKey: string;
  championName: string;
  position: Position;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
  banRate: number;
  /** `null` while there are too few games to judge. */
  tier: Tier | null;
}

export interface ChampionTable {
  source: "live" | "demo";
  patch: string | null;
  patches: string[];
  matches: number;
  minGames: number;
  rows: TierRow[];
}

export interface ChampionPage {
  source: "live" | "demo";
  championKey: string;
  championName: string;
  patch: string | null;
  patches: string[];
  matches: number;
  position: Position | null;
  positions: { position: Position; games: number; wins: number }[];
  games: number;
  wins: number;
  bans: number;
  /** Most picked first, with what is needed to show each. */
  picks: Record<PickKind, PickRow[]>;
  /** Lane opponents in the chosen position, with enough games to judge. */
  matchups: { best: MatchupView[]; worst: MatchupView[]; minGames: number; opponents: number };
}

export interface MatchupView {
  championKey: string;
  championName: string;
  games: number;
  wins: number;
}

export interface PickRow {
  choice: string;
  games: number;
  wins: number;
  label: string;
  /** One icon, or two for a pair of summoner spells. */
  icons: string[];
}

/**
 * A champion needs this many games before it gets a tier: at least 20, and
 * at least half a percent of all games on the patch.
 */
export function minGamesFor(matches: number): number {
  return Math.max(20, Math.ceil(matches * 0.005));
}

/**
 * Win rate pulled toward 50% by a hundred imaginary games, so that a
 * champion on 9 wins from 12 games doesn't top the list on luck.
 */
export function adjustedWinRate(wins: number, games: number): number {
  return (wins + 50) / (games + 100);
}

/** A lane opponent needs this many games before it is listed. */
export function minMatchupGames(roleGames: number): number {
  return Math.max(3, Math.ceil(roleGames * 0.01));
}

/**
 * Splits opponents into the ones this champion beats most and loses to most,
 * judged on win rate pulled toward 50% by ten games so a 3-0 doesn't top the list.
 */
export function rankMatchups(rows: MatchupView[], minGames: number, count = 5) {
  const score = (m: MatchupView) => (m.wins + 5) / (m.games + 10);
  const judged = rows.filter((m) => m.games >= minGames);
  const best = [...judged].sort((a, b) => score(b) - score(a) || b.games - a.games).filter((m) => score(m) > 0.5).slice(0, count);
  const worst = [...judged]
    .sort((a, b) => score(a) - score(b) || b.games - a.games)
    .filter((m) => score(m) < 0.5 && !best.includes(m))
    .slice(0, count);
  return { best, worst };
}

export function tierFor(wins: number, games: number, minGames: number): Tier | null {
  if (games < minGames) return null;
  const rate = adjustedWinRate(wins, games);
  if (rate >= 0.525) return "S";
  if (rate >= 0.51) return "A";
  if (rate >= 0.495) return "B";
  if (rate >= 0.48) return "C";
  return "D";
}

// ------------------------------------------------------------ sample data

let demoStore: Promise<Store> | null = null;

/**
 * In sample-data mode the statistics are built from a few thousand generated
 * games, run through the same recording code as real ones.
 */
function sampleStore(): Promise<Store> {
  demoStore ??= (async () => {
    const store = new MemoryStore();
    const region = { slug: "euw", defaultTag: "EUW" };
    const players = demoLadder(region, "master", "RANKED_SOLO_5x5").slice(0, 80);
    const isBuildItem = (id: number) => id in ITEM_NAMES && ![2052, 3340, 3363, 3364].includes(id);
    for (const p of players) {
      const { matches } = demoMatches(region, p.gameName!, p.tagLine!, 0, 60, Date.UTC(2026, 10, 1));
      for (const m of matches) {
        const delta = matchDelta(m, isBuildItem);
        if (delta) await store.recordMatch(delta);
      }
    }
    return store;
  })();
  return demoStore;
}

async function source(): Promise<{ store: Store; demo: boolean }> {
  const demo = riotApiKey() === null;
  return { store: demo ? await sampleStore() : getStore(), demo };
}

// ---------------------------------------------------------------- queries

export async function getChampionTable(requestedPatch?: string): Promise<ChampionTable> {
  const { store, demo } = await source();
  const [patches, staticData] = await Promise.all([store.patches(), getStaticData()]);
  const current = patches.find((p) => p.patch === requestedPatch) ?? patches[0];
  const base = {
    source: demo ? ("demo" as const) : ("live" as const),
    patches: patches.map((p) => p.patch),
  };
  if (!current) return { ...base, patch: null, matches: 0, minGames: minGamesFor(0), rows: [] };

  const { rows, bans } = await store.championTable(current.patch);
  const minGames = minGamesFor(current.matches);
  const nameOf = new Map<string, string>();

  return {
    ...base,
    patch: current.patch,
    matches: current.matches,
    minGames,
    rows: rows.map((r) => {
      const name = nameOf.get(r.champion) ?? championName(staticData, r.champion);
      nameOf.set(r.champion, name);
      return {
        championKey: r.champion,
        championName: name,
        position: r.position,
        games: r.games,
        wins: r.wins,
        winRate: r.wins / r.games,
        pickRate: r.games / current.matches,
        banRate: (bans.get(r.champion) ?? 0) / current.matches,
        tier: tierFor(r.wins, r.games, minGames),
      };
    }),
  };
}

function championName(staticData: Awaited<ReturnType<typeof getStaticData>>, key: string): string {
  return staticData.championByKey(key)?.name ?? key;
}

export async function getChampionPage(
  championKey: string,
  requestedPatch?: string,
  requestedPosition?: string,
): Promise<ChampionPage | null> {
  const { store, demo } = await source();
  const [patches, staticData] = await Promise.all([store.patches(), getStaticData()]);
  const known = staticData.championByKey(championKey);
  if (!known) return null;

  const current = patches.find((p) => p.patch === requestedPatch) ?? patches[0];
  const empty: ChampionDetail = { positions: [], bans: 0, picks: [] };
  const [detail, lanes] = current
    ? await Promise.all([store.championDetail(current.patch, known.key), store.championMatchups(current.patch, known.key)])
    : [empty, []];

  const positions = [...detail.positions].sort((a, b) => b.games - a.games);
  const position =
    positions.find((p) => p.position === requestedPosition?.toUpperCase())?.position ??
    positions[0]?.position ??
    null;
  const games = positions.reduce((n, p) => n + p.games, 0);
  const wins = positions.reduce((n, p) => n + p.wins, 0);

  // Picks are counted per champion, not per position, so they cover every role it was played in.
  const describe = (kind: PickKind, choice: string): Pick<PickRow, "label" | "icons"> => {
    if (kind === "item") {
      const id = Number(choice);
      return {
        label: staticData.itemName(id) ?? `Item ${id}`,
        icons: [`https://ddragon.leagueoflegends.com/cdn/${staticData.version}/img/item/${id}.png`],
      };
    }
    if (kind === "spells") {
      const pair = choice.split("+").map((id) => staticData.spell(Number(id)));
      return {
        label: pair.map((s, i) => s?.name ?? `Spell ${choice.split("+")[i]}`).join(" + "),
        icons: pair.flatMap((s) => (s ? [s.icon] : [])),
      };
    }
    const rune = staticData.rune(Number(choice));
    return { label: rune?.name ?? `Rune ${choice}`, icons: rune ? [rune.icon] : [] };
  };

  const picks = { item: [], keystone: [], secondary: [], spells: [] } as ChampionPage["picks"];
  for (const p of detail.picks) {
    picks[p.kind].push({ choice: p.choice, games: p.games, wins: p.wins, ...describe(p.kind, p.choice) });
  }
  for (const list of Object.values(picks)) list.sort((a, b) => b.games - a.games || b.wins - a.wins);

  const roleGames = positions.find((p) => p.position === position)?.games ?? 0;
  const minMatchup = minMatchupGames(roleGames);
  const opponents: MatchupView[] = lanes
    .filter((m) => m.position === position)
    .map((m) => ({
      championKey: m.opponent,
      championName: championName(staticData, m.opponent),
      games: m.games,
      wins: m.wins,
    }));

  return {
    source: demo ? "demo" : "live",
    matchups: { ...rankMatchups(opponents, minMatchup), minGames: minMatchup, opponents: opponents.length },
    championKey: known.key,
    championName: known.name,
    patch: current?.patch ?? null,
    patches: patches.map((p) => p.patch),
    matches: current?.matches ?? 0,
    position,
    positions,
    games,
    wins,
    bans: detail.bans,
    picks,
  };
}

export const POSITION_SLUGS: Record<Position, string> = {
  TOP: "top",
  JUNGLE: "jungle",
  MIDDLE: "mid",
  BOTTOM: "bot",
  UTILITY: "support",
};

export function positionFromSlug(slug: unknown): Position | null {
  return POSITIONS.find((p) => POSITION_SLUGS[p] === slug) ?? null;
}
