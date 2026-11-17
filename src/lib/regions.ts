/**
 * Riot splits its API across "platform" hosts (one per game server, e.g. euw1)
 * and "regional" hosts (continental clusters, e.g. europe). Which one an
 * endpoint lives on is fixed by Riot, so every region carries both.
 */

export type AccountRoute = "americas" | "asia" | "europe";
export type MatchRoute = AccountRoute | "sea";

export interface Region {
  /** Short, URL-friendly identifier used in our routes. */
  slug: string;
  /** Riot platform routing value (summoner, league, mastery endpoints). */
  platform: string;
  /** Regional routing value for match-v5. */
  matchRoute: MatchRoute;
  /** Regional routing value for account-v1 (there is no "sea" cluster for it). */
  accountRoute: AccountRoute;
  label: string;
  name: string;
  /** Tagline most accounts on this server got when Riot IDs were introduced. */
  defaultTag: string;
}

export const REGIONS: Region[] = [
  { slug: "na", platform: "na1", matchRoute: "americas", accountRoute: "americas", label: "NA", name: "North America", defaultTag: "NA1" },
  { slug: "euw", platform: "euw1", matchRoute: "europe", accountRoute: "europe", label: "EUW", name: "Europe West", defaultTag: "EUW" },
  { slug: "eune", platform: "eun1", matchRoute: "europe", accountRoute: "europe", label: "EUNE", name: "Europe Nordic & East", defaultTag: "EUNE" },
  { slug: "kr", platform: "kr", matchRoute: "asia", accountRoute: "asia", label: "KR", name: "Korea", defaultTag: "KR1" },
  { slug: "jp", platform: "jp1", matchRoute: "asia", accountRoute: "asia", label: "JP", name: "Japan", defaultTag: "JP1" },
  { slug: "br", platform: "br1", matchRoute: "americas", accountRoute: "americas", label: "BR", name: "Brazil", defaultTag: "BR1" },
  { slug: "lan", platform: "la1", matchRoute: "americas", accountRoute: "americas", label: "LAN", name: "Latin America North", defaultTag: "LAN" },
  { slug: "las", platform: "la2", matchRoute: "americas", accountRoute: "americas", label: "LAS", name: "Latin America South", defaultTag: "LAS" },
  { slug: "oce", platform: "oc1", matchRoute: "sea", accountRoute: "asia", label: "OCE", name: "Oceania", defaultTag: "OCE" },
  { slug: "tr", platform: "tr1", matchRoute: "europe", accountRoute: "europe", label: "TR", name: "Türkiye", defaultTag: "TR1" },
  { slug: "ru", platform: "ru", matchRoute: "europe", accountRoute: "europe", label: "RU", name: "Russia", defaultTag: "RU1" },
  { slug: "me", platform: "me1", matchRoute: "europe", accountRoute: "europe", label: "ME", name: "Middle East", defaultTag: "ME1" },
  { slug: "sea", platform: "sg2", matchRoute: "sea", accountRoute: "asia", label: "SEA", name: "Southeast Asia", defaultTag: "SG2" },
  { slug: "tw", platform: "tw2", matchRoute: "sea", accountRoute: "asia", label: "TW", name: "Taiwan", defaultTag: "TW2" },
  { slug: "vn", platform: "vn2", matchRoute: "sea", accountRoute: "asia", label: "VN", name: "Vietnam", defaultTag: "VN2" },
];

export const DEFAULT_REGION = "euw";

const BY_SLUG = new Map(REGIONS.map((r) => [r.slug, r]));

export function getRegion(slug: string | undefined | null): Region | undefined {
  return slug ? BY_SLUG.get(slug.toLowerCase()) : undefined;
}
