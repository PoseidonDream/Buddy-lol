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
  /** Each player against the enemy in the same position, both ways round. */
  matchups: { champion: string; position: Position; opponent: string; win: boolean }[];
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

/** How one champion did against one lane opponent. */
export interface MatchupRow {
  position: Position;
  opponent: string;
  games: number;
  wins: number;
}

export interface ChampionDetail {
  positions: { position: Position; games: number; wins: number }[];
  bans: number;
  picks: { kind: PickKind; choice: string; games: number; wins: number }[];
}

/**
 * A comment on a player. Comments are public; notes written before comments
 * existed were private to the site's owners and stay hidden (`public: false`).
 */
export interface PlayerNote {
  id: string;
  puuid: string;
  regionSlug: string;
  /** "Name#TAG" at the time of writing, in case the player renames. */
  riotId: string;
  author: string;
  /** May be empty when the note is only tags. */
  body: string;
  /** Quick labels: preset ids (see note-tags.ts) or short custom text. */
  tags: string[];
  /** Shown to everyone. Only public comments are ever listed or counted. */
  public: boolean;
  /** Epoch milliseconds. */
  at: number;
}

/** What the notes on one player add up to, for showing at a glance. */
export interface NoteSummary {
  count: number;
  /** Every tag used on the player, most used first. */
  tags: string[];
}

/** A player pinned to the home page by one of the site's owners. */
export interface PinnedPlayer {
  puuid: string;
  regionSlug: string;
  /** "Name#TAG" when pinned; the home page looks up the current name. */
  riotId: string;
  pinnedBy: string;
  /** Epoch milliseconds. */
  at: number;
}

/** A message sent with the feedback button. */
export interface Feedback {
  id: string;
  body: string;
  /** How to reach the sender, if they gave one. */
  contact: string;
  /** The page they were on, e.g. "/champions". */
  page: string;
  /** Epoch milliseconds. */
  at: number;
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

  /** Saves a note and returns its id. */
  addNote(note: Omit<PlayerNote, "id">): Promise<string>;
  /** Public comments on one player, newest first. */
  listNotes(puuid: string): Promise<PlayerNote[]>;
  /** False if no such note. */
  deleteNote(id: string): Promise<boolean>;
  /** Public comment count and tags for each of these players; players without any are left out. */
  noteSummaries(puuids: string[]): Promise<Record<string, NoteSummary>>;

  /** Pins a player, or updates the pin if already pinned. */
  pinPlayer(pin: PinnedPlayer): Promise<void>;
  /** False if the player wasn't pinned. */
  unpinPlayer(puuid: string): Promise<boolean>;
  /** Oldest pin first. */
  listPinned(): Promise<PinnedPlayer[]>;

  addFeedback(item: Omit<Feedback, "id">): Promise<string>;
  /** Newest first. */
  listFeedback(limit: number): Promise<Feedback[]>;
  deleteFeedback(id: string): Promise<boolean>;

  /** Rank snapshots older than this are deleted. Returns how many. */
  pruneRanks(before: number): Promise<number>;

  /**
   * Adds `amount` to a counter for one time window and returns the new total.
   * Used for rate limiting; old windows are cleaned up by the store.
   */
  countHits(bucket: string, windowStart: number, amount: number): Promise<number>;

  /** Adds a game to the champion statistics. False if it was already counted. */
  recordMatch(delta: MatchDelta): Promise<boolean>;
  /** Which of these match ids have been counted already. */
  seenMatches(ids: string[]): Promise<Set<string>>;

  /** Patches with data, newest first. */
  patches(): Promise<PatchTotal[]>;
  championTable(patch: string): Promise<{ rows: ChampionRow[]; bans: Map<string, number> }>;
  championDetail(patch: string, champion: string): Promise<ChampionDetail>;
  /** The champion against each lane opponent it has met, in every position. */
  championMatchups(patch: string, champion: string): Promise<MatchupRow[]>;
}

/** Combines notes into a summary: count, and tags most used first. */
export function summarizeNotes(notes: Pick<PlayerNote, "puuid" | "tags">[]): Record<string, NoteSummary> {
  const byPlayer = new Map<string, { count: number; tags: Map<string, number> }>();
  for (const n of notes) {
    const entry = byPlayer.get(n.puuid) ?? { count: 0, tags: new Map() };
    entry.count++;
    for (const tag of n.tags) entry.tags.set(tag, (entry.tags.get(tag) ?? 0) + 1);
    byPlayer.set(n.puuid, entry);
  }
  return Object.fromEntries(
    [...byPlayer].map(([puuid, e]) => [
      puuid,
      // Map keeps first-use order, and sort is stable, so ties stay in that order.
      { count: e.count, tags: [...e.tags].sort((a, b) => b[1] - a[1]).map(([t]) => t) },
    ]),
  );
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
