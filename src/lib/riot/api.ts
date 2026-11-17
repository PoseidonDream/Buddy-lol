import "server-only";

import { matchListQuery, type ServerFilter } from "../game-data";
import type { Region } from "../regions";
import { riotGet } from "./client";
import type {
  AccountDto,
  LeagueEntryDto,
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

/** A finished match never changes, so it is cached for a long time. */
export function getMatch(region: Region, matchId: string) {
  return riotGet<MatchDto>(
    region.matchRoute,
    `/lol/match/v5/matches/${enc(matchId)}`,
    30 * DAY,
  );
}
