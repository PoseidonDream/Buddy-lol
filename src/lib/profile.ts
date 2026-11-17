import "server-only";

import { demoMatches, demoProfile } from "./demo/generate";
import { dictionaries } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { getStaticData } from "./ddragon";
import { queueGroup, type ServerFilter } from "./game-data";
import { collectItemNames } from "./item-names";
import { getRegion, type Region } from "./regions";
import { riotIdFromSlug, riotIdToSlug, type RiotId } from "./riot-id";
import {
  getAccount,
  getLeagueEntries,
  getMatch,
  getMatchIds,
  getSummoner,
  getTopMasteries,
} from "./riot/api";
import { RiotApiError, riotApiKey } from "./riot/client";
import { mapMastery, mapMatch, mapRanked, type ChampionLookup } from "./riot/mapper";
import type { MatchPage, MatchSummary, Profile, ProfileError, Result } from "./types";

export const MATCH_PAGE_SIZE = 10;

function trimMastery(profile: Profile, count: number): Profile {
  return { ...profile, mastery: profile.mastery.slice(0, count) };
}
const MASTERY_COUNT = 6;

/** Without an API key the site serves generated sample data. */
export function isDemoMode(): boolean {
  return riotApiKey() === null;
}

function fail<T>(kind: ProfileError["kind"], message: string): Result<T> {
  return { ok: false, error: { kind, message } };
}

export function describeRiotError<T>(err: unknown, locale: Locale = "en"): Result<T> {
  if (!(err instanceof RiotApiError)) throw err;
  const t = dictionaries[locale].errors;
  if (err.status === 429) return fail("rate_limited", t.rateLimited);
  if (err.status === 401 || err.status === 403) return fail("auth", t.auth);
  return fail("upstream", t.upstream);
}

function resolve(regionSlug: string, riotIdSlug: string): { region: Region; id: RiotId } | null {
  const region = getRegion(regionSlug);
  const id = riotIdFromSlug(riotIdSlug);
  return region && id ? { region, id } : null;
}


/** Fetch matches a few at a time: a burst of 10+ parallel calls trips the rate limit. */
async function fetchMatches(
  region: Region,
  ids: string[],
  puuid: string,
  champion: ChampionLookup,
): Promise<MatchSummary[]> {
  const results: (MatchSummary | null)[] = new Array(ids.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const i = next++;
      try {
        const dto = await getMatch(region, ids[i]);
        results[i] = dto ? mapMatch(dto, puuid, champion) : null;
      } catch (err) {
        // One unreadable match should not sink the page, but a rate limit
        // or a bad key will hit every call, so let those through.
        if (err instanceof RiotApiError && [401, 403, 429].includes(err.status)) throw err;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker));
  return results.filter((m): m is MatchSummary => m !== null);
}

export interface ProfileSize {
  /** Matches to include. */
  matches: number;
  /** Champions to include in the mastery list. */
  mastery: number;
}

const FULL_PROFILE: ProfileSize = { matches: MATCH_PAGE_SIZE, mastery: MASTERY_COUNT };

/**
 * A player's profile. `size` trims it for places that show several players
 * at once, where every match fetched costs a request against the rate limit.
 */
export async function getProfile(
  regionSlug: string,
  riotIdSlug: string,
  size: ProfileSize = FULL_PROFILE,
  locale: Locale = "en",
): Promise<Result<Profile>> {
  const t = dictionaries[locale].errors;
  const target = resolve(regionSlug, riotIdSlug);
  if (!target) return fail("invalid", t.invalidId);
  const { region, id } = target;

  const staticData = await getStaticData(locale);
  const now = Date.now();

  if (isDemoMode()) {
    return {
      ok: true,
      data: trimMastery(
        demoProfile(region, id.gameName, id.tagLine, size.matches, staticData.version, now),
        size.mastery,
      ),
    };
  }

  try {
    const account = await getAccount(region, id.gameName, id.tagLine);
    if (!account) {
      return fail("not_found", t.noAccount(`${id.gameName}#${id.tagLine}`));
    }
    const { puuid } = account;

    const [summoner, leagues, masteries, matchIds] = await Promise.all([
      getSummoner(region, puuid),
      getLeagueEntries(region, puuid),
      // Skip the request entirely when nothing would be shown.
      size.mastery > 0 ? getTopMasteries(region, puuid, size.mastery) : Promise.resolve([]),
      // One extra id tells us whether there is another page.
      getMatchIds(region, puuid, 0, size.matches + 1),
    ]);
    if (!summoner) {
      return fail("not_found", t.noProfile(`${id.gameName}#${id.tagLine}`, region.label));
    }

    const ids = matchIds ?? [];
    const matches = await fetchMatches(
      region,
      ids.slice(0, size.matches),
      puuid,
      staticData.champion,
    );

    return {
      ok: true,
      data: {
        source: "live",
        regionSlug: region.slug,
        puuid,
        gameName: account.gameName ?? id.gameName,
        tagLine: account.tagLine ?? id.tagLine,
        requestSlug: riotIdToSlug(id),
        profileIconId: summoner.profileIconId,
        level: summoner.summonerLevel,
        ranked: mapRanked(leagues ?? []),
        mastery: mapMastery(masteries ?? [], staticData.champion),
        matches,
        hasMoreMatches: ids.length > size.matches,
        itemNames: collectItemNames(matches, staticData.itemName),
        assetVersion: staticData.version,
        generatedAt: now,
      },
    };
  } catch (err) {
    return describeRiotError(err, locale);
  }
}

/**
 * One page of match history. With a `filter`, `start` counts within that
 * queue's games rather than within all of them.
 */
export async function getMatchPage(
  regionSlug: string,
  riotIdSlug: string,
  start: number,
  filter?: ServerFilter,
  locale: Locale = "en",
): Promise<Result<MatchPage>> {
  const t = dictionaries[locale].errors;
  const target = resolve(regionSlug, riotIdSlug);
  if (!target) return fail("invalid", t.invalidId);
  const { region, id } = target;

  if (isDemoMode()) {
    return {
      ok: true,
      data: demoMatches(region, id.gameName, id.tagLine, start, MATCH_PAGE_SIZE, Date.now(), filter),
    };
  }

  try {
    const account = await getAccount(region, id.gameName, id.tagLine);
    if (!account) return fail("not_found", t.accountGone);

    const [staticData, matchIds] = await Promise.all([
      getStaticData(locale),
      getMatchIds(region, account.puuid, start, MATCH_PAGE_SIZE + 1, filter),
    ]);
    const ids = matchIds ?? [];
    const fetched = await fetchMatches(
      region,
      ids.slice(0, MATCH_PAGE_SIZE),
      account.puuid,
      staticData.champion,
    );
    // Riot's own filter can be broader than ours (see matchListQuery).
    const matches = filter
      ? fetched.filter((m) => queueGroup(m.queueId) === filter)
      : fetched;
    return {
      ok: true,
      data: {
        matches,
        hasMore: ids.length > MATCH_PAGE_SIZE,
        itemNames: collectItemNames(matches, staticData.itemName),
      },
    };
  } catch (err) {
    return describeRiotError(err, locale);
  }
}
