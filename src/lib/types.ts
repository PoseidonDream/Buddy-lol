/**
 * View models. Everything the UI renders is expressed in these shapes, whether
 * it came from the Riot API or from the sample-data generator.
 */

export type Position = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY";

export type Tier =
  | "IRON"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "EMERALD"
  | "DIAMOND"
  | "MASTER"
  | "GRANDMASTER"
  | "CHALLENGER";

export type RankedQueue = "RANKED_SOLO_5x5" | "RANKED_FLEX_SR";

export interface RankedEntry {
  queue: RankedQueue;
  tier: Tier;
  /** Division, "I" to "IV". Empty for Master and above. */
  division: string;
  lp: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
}

export interface MasteryEntry {
  championId: number;
  championKey: string;
  championName: string;
  level: number;
  points: number;
  lastPlayed: number;
}

export interface ParticipantSummary {
  puuid: string;
  gameName: string;
  tagLine: string;
  championId: number;
  /** Data Dragon id, e.g. "MonkeyKing". Used to build image URLs. */
  championKey: string;
  championName: string;
  champLevel: number;
  teamId: number;
  win: boolean;
  position: Position | null;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  damageTaken: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  controlWards: number;
  /** Six inventory slots followed by the trinket. 0 means empty. */
  items: number[];
  spells: [number, number];
  keystone: number | null;
  secondaryStyle: number | null;
  /** Largest multi-kill in the game: 2 = double ... 5 = penta. */
  largestMultiKill: number;
  /** Final placement, only in modes that rank teams (Arena). */
  placement: number | null;
}

export interface TeamSummary {
  id: number;
  win: boolean;
  kills: number;
  gold: number;
  towers: number;
  dragons: number;
  barons: number;
  /** Final placement, only in modes that rank teams (Arena). */
  placement: number | null;
  participants: ParticipantSummary[];
}

export interface MatchSummary {
  id: string;
  queueId: number;
  /** Raw game mode from the API, used as a label when the queue is unknown. */
  gameMode: string;
  /** When the game ended, epoch milliseconds. */
  endedAt: number;
  durationSec: number;
  /** Ended in an early surrender: counts as neither a win nor a loss. */
  remake: boolean;
  /** The player this history belongs to. */
  me: ParticipantSummary;
  teams: TeamSummary[];
}

export interface Profile {
  /** "demo" means generated sample data, not a real account. */
  source: "live" | "demo";
  regionSlug: string;
  puuid: string;
  gameName: string;
  tagLine: string;
  /**
   * The Riot ID exactly as it was requested, URL-encoded. Riot returns its own
   * capitalisation in `gameName`; follow-up requests reuse this spelling so
   * they hit the account lookup that is already cached.
   */
  requestSlug: string;
  profileIconId: number;
  level: number;
  ranked: RankedEntry[];
  mastery: MasteryEntry[];
  matches: MatchSummary[];
  hasMoreMatches: boolean;
  /** Data Dragon version to load images from. */
  assetVersion: string;
  /** When this snapshot was built, epoch milliseconds. */
  generatedAt: number;
}

export type ProfileErrorKind =
  | "invalid"
  | "not_found"
  | "rate_limited"
  | "auth"
  | "upstream";

export interface ProfileError {
  kind: ProfileErrorKind;
  message: string;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ProfileError };

export interface MatchPage {
  matches: MatchSummary[];
  hasMore: boolean;
}
