import type { Position, RankedQueue, Tier } from "../types";

export interface RankSnapshot {
  puuid: string;
  regionSlug: string;
  queue: RankedQueue;
  tier: Tier;
  division: string;
  lp: number;
  wins: number;
  losses: number;
  /** Epoch milliseconds. */
  at: number;
}

/** What one ranked game adds to the champion statistics. */
export interface MatchDelta {
  matchId: string;
  /** "16.22" */
  patch: string;
  champions: { champion: string; position: Position; win: boolean }[];
  /** Champion keys banned in the game. */
  bans: string[];
  /** Build and loadout choices, one per player per kind. */
  picks: { champion: string; kind: PickKind; choice: string; win: boolean }[];
}

export type PickKind = "item" | "keystone" | "secondary" | "spells";

export interface PatchTotal {
  patch: string;
  matches: number;
}

export interface ChampionRow {
  champion: string;
  position: Position;
  games: number;
  wins: number;
}

export interface ChampionDetail {
  positions: { position: Position; games: number; wins: number }[];
  bans: number;
  picks: { kind: PickKind; choice: string; games: number; wins: number }[];
}

export interface Store {
  /** Where the data lives, for status messages. */
  readonly kind: "postgres" | "file" | "memory";

  /** Adds a snapshot unless it matches the player's latest one exactly. */
  recordRank(snapshot: RankSnapshot): Promise<void>;
  /** recordRank for many players at once (one round trip on Postgres). */
  recordRanks(snapshots: RankSnapshot[]): Promise<void>;
  /** Snapshots taken at or after `since`, oldest first. */
  rankHistory(puuid: string, queue: RankedQueue, since: number): Promise<RankSnapshot[]>;

  /** Adds a game to the champion statistics. False if it was already counted. */
  recordMatch(delta: MatchDelta): Promise<boolean>;
  /** Which of these match ids have been counted already. */
  seenMatches(ids: string[]): Promise<Set<string>>;

  /** Patches with data, newest first. */
  patches(): Promise<PatchTotal[]>;
  championTable(patch: string): Promise<{ rows: ChampionRow[]; bans: Map<string, number> }>;
  championDetail(patch: string, champion: string): Promise<ChampionDetail>;
}

/** Newest patch first: "16.3" sorts after "16.22". */
export function comparePatches(a: string, b: string): number {
  const [aMajor, aMinor] = a.split(".").map(Number);
  const [bMajor, bMinor] = b.split(".").map(Number);
  return bMajor - aMajor || bMinor - aMinor;
}

export function sameRank(a: Omit<RankSnapshot, "at">, b: Omit<RankSnapshot, "at">): boolean {
  return (
    a.tier === b.tier &&
    a.division === b.division &&
    a.lp === b.lp &&
    a.wins === b.wins &&
    a.losses === b.losses
  );
}
