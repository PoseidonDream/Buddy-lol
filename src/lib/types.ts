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

/** Item id -> display name. Items we have no name for are simply absent. */
export type ItemNames = Record<number, string>;

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
  /** Our 0-10 rating of this player's game (see score.ts). 0 in a remake. */
  score: number;
  /** 1 for the best score in the game. 0 in a remake. */
  scoreRank: number;
  /** MVP: best score on a winning team. ACE: best score on a losing team. */
  badge: "MVP" | "ACE" | null;
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
  /** Champion keys this side banned. */
  bans: string[];
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
  /** Game patch as "major.minor", e.g. "16.22". Empty if unknown. */
  patch: string;
  /** The player this history belongs to. */
  me: ParticipantSummary;
  teams: TeamSummary[];
}

export interface RankHistoryPoint {
  /** Epoch milliseconds. */
  at: number;
  /** Position on the rank scale (see rank-scale.ts). */
  value: number;
  /** "Gold II · 54 LP" */
  label: string;
}

export interface RankHistory {
  queue: RankedQueue;
  points: RankHistoryPoint[];
  /** "demo" history is generated; "live" history is what this site has recorded. */
  source: "live" | "demo";
}

export type ApexTier = "challenger" | "grandmaster" | "master";

export interface LadderEntry {
  /** 1 for the top of the ladder. */
  position: number;
  puuid: string;
  /** `null` when the name could not be looked up (usually a rate limit). */
  gameName: string | null;
  tagLine: string | null;
  lp: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
}

export interface LadderPage {
  source: "live" | "demo";
  regionSlug: string;
  tier: ApexTier;
  queue: RankedQueue;
  /** 1-based. */
  page: number;
  pageSize: number;
  /** Players in this tier. */
  total: number;
  entries: LadderEntry[];
}

/** A player in a game that is still being played. */
export interface LivePlayer {
  /** Missing when the player hides their identity from spectators. */
  puuid: string | null;
  gameName: string;
  tagLine: string;
  championId: number;
  championKey: string;
  championName: string;
  spells: [number, number];
  keystone: number | null;
  secondaryStyle: number | null;
  /** Solo rank, or flex if they have no solo rank. `null` if unranked or unknown. */
  rank: RankedEntry | null;
  /** Mastery on the champion they are playing. `null` if unknown. */
  mastery: { level: number; points: number } | null;
}

export interface LiveTeam {
  id: number;
  players: LivePlayer[];
  bans: { championKey: string; championName: string }[];
}

export interface LiveGame {
  queueId: number;
  gameMode: string;
  /** Epoch milliseconds. `null` while the game is still on the loading screen. */
  startedAt: number | null;
  teams: LiveTeam[];
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
  /** Names of the items that appear in `matches`, for tooltips. */
  itemNames: ItemNames;
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
  /** Names of the items that appear in `matches`, for tooltips. */
  itemNames: ItemNames;
}
