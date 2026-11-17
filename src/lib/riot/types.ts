/** The parts of Riot's API responses this app reads. */

export interface AccountDto {
  puuid: string;
  gameName?: string;
  tagLine?: string;
}

export interface SummonerDto {
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
  revisionDate: number;
}

export interface LeagueEntryDto {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak?: boolean;
}

export interface MasteryDto {
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
}

export interface PerkStyleDto {
  style: number;
  selections?: { perk: number }[];
}

export interface ParticipantDto {
  puuid: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
  championId: number;
  championName?: string;
  champLevel: number;
  teamId: number;
  win: boolean;
  teamPosition?: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  goldEarned?: number;
  totalDamageDealtToChampions?: number;
  totalDamageTaken?: number;
  visionScore?: number;
  wardsPlaced?: number;
  wardsKilled?: number;
  visionWardsBoughtInGame?: number;
  item0?: number;
  item1?: number;
  item2?: number;
  item3?: number;
  item4?: number;
  item5?: number;
  item6?: number;
  summoner1Id?: number;
  summoner2Id?: number;
  perks?: { styles?: PerkStyleDto[] };
  largestMultiKill?: number;
  gameEndedInEarlySurrender?: boolean;
  /** Arena only: which duo the player is on, and how that duo placed. */
  playerSubteamId?: number;
  subteamPlacement?: number;
  placement?: number;
}

/** spectator-v5: a game in progress. */
export interface CurrentGameDto {
  gameMode?: string;
  gameQueueConfigId?: number;
  /** Epoch milliseconds; 0 until the loading screen is over. */
  gameStartTime?: number;
  bannedChampions?: { championId: number; teamId: number }[];
  participants: {
    puuid?: string | null;
    /** "GameName#TAG" */
    riotId?: string;
    bot?: boolean;
    teamId: number;
    championId: number;
    spell1Id?: number;
    spell2Id?: number;
    perks?: { perkIds?: number[]; perkSubStyle?: number };
  }[];
}

export interface ObjectiveDto {
  kills?: number;
}

export interface TeamDto {
  teamId: number;
  win: boolean;
  objectives?: {
    baron?: ObjectiveDto;
    dragon?: ObjectiveDto;
    tower?: ObjectiveDto;
  };
}

export interface MatchDto {
  metadata: { matchId: string; participants?: string[] };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp?: number;
    gameMode?: string;
    /** Full build number, e.g. "16.22.731.2941". */
    gameVersion?: string;
    queueId: number;
    participants: ParticipantDto[];
    teams?: TeamDto[];
  };
}
