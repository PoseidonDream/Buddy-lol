/** Riot API responses -> the view models in ../types. Pure functions. */

import { POSITIONS, TIERS } from "../game-data";
import type {
  MasteryEntry,
  MatchSummary,
  ParticipantSummary,
  Position,
  RankedEntry,
  RankedQueue,
  TeamSummary,
  Tier,
} from "../types";
import type {
  LeagueEntryDto,
  MasteryDto,
  MatchDto,
  ParticipantDto,
} from "./types";

export type ChampionLookup = (
  id: number,
  apiName?: string,
) => { key: string; name: string };

const RANKED_QUEUES: RankedQueue[] = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"];

export function mapRanked(entries: LeagueEntryDto[]): RankedEntry[] {
  const out: RankedEntry[] = [];
  for (const queue of RANKED_QUEUES) {
    const e = entries.find((x) => x.queueType === queue);
    if (!e || !TIERS.includes(e.tier as Tier)) continue;
    out.push({
      queue,
      tier: e.tier as Tier,
      division: e.rank,
      lp: e.leaguePoints,
      wins: e.wins,
      losses: e.losses,
      hotStreak: Boolean(e.hotStreak),
    });
  }
  return out;
}

export function mapMastery(list: MasteryDto[], champion: ChampionLookup): MasteryEntry[] {
  return list.map((m) => {
    const c = champion(m.championId);
    return {
      championId: m.championId,
      championKey: c.key,
      championName: c.name,
      level: m.championLevel,
      points: m.championPoints,
      lastPlayed: m.lastPlayTime,
    };
  });
}

function isArena(p: ParticipantDto): boolean {
  return (p.playerSubteamId ?? 0) > 0;
}

function mapParticipant(p: ParticipantDto, champion: ChampionLookup): ParticipantSummary {
  const c = champion(p.championId, p.championName);
  const arena = isArena(p);
  const [primary, secondary] = p.perks?.styles ?? [];
  const position = POSITIONS.includes(p.teamPosition as Position)
    ? (p.teamPosition as Position)
    : null;

  return {
    puuid: p.puuid,
    gameName: p.riotIdGameName || p.summonerName || "Unknown",
    tagLine: p.riotIdTagline || "",
    championId: p.championId,
    championKey: c.key,
    championName: c.name,
    champLevel: p.champLevel,
    // Arena has eight duos rather than two sides, so group by duo there.
    teamId: arena ? p.playerSubteamId! : p.teamId,
    win: p.win,
    position,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    cs: (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0),
    gold: p.goldEarned ?? 0,
    damage: p.totalDamageDealtToChampions ?? 0,
    damageTaken: p.totalDamageTaken ?? 0,
    visionScore: p.visionScore ?? 0,
    wardsPlaced: p.wardsPlaced ?? 0,
    wardsKilled: p.wardsKilled ?? 0,
    controlWards: p.visionWardsBoughtInGame ?? 0,
    items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map(
      (i) => i ?? 0,
    ),
    spells: [p.summoner1Id ?? 0, p.summoner2Id ?? 0],
    keystone: primary?.selections?.[0]?.perk ?? null,
    secondaryStyle: secondary?.style ?? null,
    largestMultiKill: p.largestMultiKill ?? 0,
    placement: arena ? (p.subteamPlacement ?? p.placement ?? null) : null,
  };
}

/**
 * Returns `null` when the match does not contain the player, which only
 * happens for malformed responses.
 */
export function mapMatch(
  dto: MatchDto,
  puuid: string,
  champion: ChampionLookup,
): MatchSummary | null {
  const { info } = dto;
  const participants = info.participants.map((p) => mapParticipant(p, champion));
  const me = participants.find((p) => p.puuid === puuid);
  if (!me) return null;

  // Before `gameEndTimestamp` existed (patch 11.20) durations were in ms.
  const durationSec = info.gameEndTimestamp
    ? info.gameDuration
    : Math.round(info.gameDuration / 1000);
  const endedAt = info.gameEndTimestamp ?? info.gameCreation + durationSec * 1000;

  const teams = new Map<number, TeamSummary>();
  for (const p of participants) {
    let team = teams.get(p.teamId);
    if (!team) {
      const side = info.teams?.find((t) => t.teamId === p.teamId);
      team = {
        id: p.teamId,
        win: p.win,
        kills: 0,
        gold: 0,
        towers: side?.objectives?.tower?.kills ?? 0,
        dragons: side?.objectives?.dragon?.kills ?? 0,
        barons: side?.objectives?.baron?.kills ?? 0,
        placement: p.placement,
        participants: [],
      };
      teams.set(p.teamId, team);
    }
    team.kills += p.kills;
    team.gold += p.gold;
    team.participants.push(p);
  }

  const ordered = [...teams.values()].sort((a, b) =>
    a.placement !== null && b.placement !== null
      ? a.placement - b.placement
      : a.id - b.id,
  );

  return {
    id: dto.metadata.matchId,
    queueId: info.queueId,
    gameMode: info.gameMode ?? "",
    endedAt,
    durationSec,
    remake: info.participants.some((p) => p.gameEndedInEarlySurrender),
    me,
    teams: ordered,
  };
}
