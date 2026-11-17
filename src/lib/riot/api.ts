import "server-only";

import { matchListQuery, type ServerFilter } from "../game-data";
import type { Region } from "../regions";
import type { ApexTier, RankedQueue } from "../types";
import { riotGet } from "./client";
import type {
  AccountDto,
  CurrentGameDto,
  LeagueEntryDto,
  LeagueListDto,
  MasteryDto,
  MatchDto,
  SummonerDto,
} from "./types";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const enc = encodeURIComponent;

export function getAccount(region: Region, gameName: string, tagLine: string) {
  return riotGet<AccountDto>(
    region.accountRoute,
    `/riot/account/v1/accounts/by-riot-id/${enc(gameName)}/${enc(tagLine)}`,
    HOUR,
  );
}

/** Names change rarely, and a ladder page needs one lookup per row, so keep these a day. */
export function getAccountByPuuid(region: Region, puuid: string) {
  return riotGet<AccountDto>(
    region.accountRoute,
    `/riot/account/v1/accounts/by-puuid/${enc(puuid)}`,
    DAY,
  );
}

/**
 * Not cached here: the Master list for a large region is bigger than the
 * fetch cache accepts. ladder.ts keeps the trimmed result in memory instead.
 */
export function getApexLeague(region: Region, tier: ApexTier, queue: RankedQueue) {
  return riotGet<LeagueListDto>(
    region.platform,
    `/lol/league/v4/${tier}leagues/by-queue/${queue}`,
    0,
  );
}

export function getSummoner(region: Region, puuid: string) {
  return riotGet<SummonerDto>(
    region.platform,
    `/lol/summoner/v4/summoners/by-puuid/${enc(puuid)}`,
    2 * MINUTE,
  );
}

export function getLeagueEntries(region: Region, puuid: string) {
  return riotGet<LeagueEntryDto[]>(
    region.platform,
    `/lol/league/v4/entries/by-puuid/${enc(puuid)}`,
    2 * MINUTE,
  );
}

export function getTopMasteries(region: Region, puuid: string, count: number) {
  return riotGet<MasteryDto[]>(
    region.platform,
    `/lol/champion-mastery/v4/champion-masteries/by-puuid/${enc(puuid)}/top?count=${count}`,
    10 * MINUTE,
  );
}

/** Mastery on one champion. Resolves to `null` if they have never played it. */
export function getChampionMastery(region: Region, puuid: string, championId: number) {
  return riotGet<MasteryDto>(
    region.platform,
    `/lol/champion-mastery/v4/champion-masteries/by-puuid/${enc(puuid)}/by-champion/${championId}`,
    10 * MINUTE,
  );
}

export function getMatchIds(
  region: Region,
  puuid: string,
  start: number,
  count: number,
  filter?: ServerFilter,
) {
  const narrowed = filter ? `&${matchListQuery(filter)}` : "";
  return riotGet<string[]>(
    region.matchRoute,
    `/lol/match/v5/matches/by-puuid/${enc(puuid)}/ids?start=${start}&count=${count}${narrowed}`,
    MINUTE,
  );
}

/** The game the player is in right now. Resolves to `null` when they are not in one. */
export function getActiveGame(region: Region, puuid: string) {
  return riotGet<CurrentGameDto>(
    region.platform,
    `/lol/spectator/v5/active-games/by-summoner/${enc(puuid)}`,
    30,
  );
}

/** A finished match never changes, so it is cached for a long time. */
export function getMatch(region: Region, matchId: string) {
  return riotGet<MatchDto>(
    region.matchRoute,
    `/lol/match/v5/matches/${enc(matchId)}`,
    30 * DAY,
  );
}
