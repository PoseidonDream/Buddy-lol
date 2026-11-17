import { describe, expect, it } from "vitest";
import { mapLiveGame, mapMatch, mapRanked } from "./mapper";
import type { MatchDto, ParticipantDto } from "./types";

const champion = (id: number, apiName?: string) => ({
  key: apiName ?? `Champ${id}`,
  name: apiName ?? `Champ ${id}`,
});

function player(i: number, extra: Partial<ParticipantDto> = {}): ParticipantDto {
  return {
    puuid: `p${i}`,
    riotIdGameName: `Player ${i}`,
    riotIdTagline: "EUW",
    championId: 100 + i,
    championName: `Champ${i}`,
    champLevel: 15,
    teamId: i < 5 ? 100 : 200,
    win: i < 5,
    teamPosition: ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"][i % 5],
    kills: i,
    deaths: 2,
    assists: 3,
    totalMinionsKilled: 180,
    neutralMinionsKilled: 20,
    goldEarned: 10_000,
    item0: 3031,
    item6: 3340,
    summoner1Id: 4,
    summoner2Id: 14,
    perks: {
      styles: [
        { style: 8000, selections: [{ perk: 8008 }, { perk: 9111 }] },
        { style: 8100, selections: [{ perk: 8139 }] },
      ],
    },
    ...extra,
  };
}

function match(overrides: Partial<MatchDto["info"]> = {}): MatchDto {
  return {
    metadata: { matchId: "EUW1_1" },
    info: {
      gameCreation: 1_700_000_000_000,
      gameDuration: 1800,
      gameEndTimestamp: 1_700_001_900_000,
      gameMode: "CLASSIC",
      queueId: 420,
      participants: Array.from({ length: 10 }, (_, i) => player(i)),
      teams: [
        { teamId: 100, win: true, objectives: { tower: { kills: 9 }, dragon: { kills: 3 }, baron: { kills: 1 } } },
        { teamId: 200, win: false, objectives: { tower: { kills: 2 }, dragon: { kills: 1 }, baron: { kills: 0 } } },
      ],
      ...overrides,
    },
  };
}

describe("mapMatch", () => {
  it("maps a standard game from one player's point of view", () => {
    const m = mapMatch(match(), "p3", champion)!;
    expect(m.id).toBe("EUW1_1");
    expect(m.durationSec).toBe(1800);
    expect(m.endedAt).toBe(1_700_001_900_000);
    expect(m.remake).toBe(false);

    expect(m.me).toMatchObject({
      gameName: "Player 3",
      win: true,
      position: "BOTTOM",
      kills: 3,
      cs: 200,
      items: [3031, 0, 0, 0, 0, 0, 3340],
      spells: [4, 14],
      keystone: 8008,
      secondaryStyle: 8100,
      placement: null,
    });

    expect(m.teams.map((t) => t.id)).toEqual([100, 200]);
    expect(m.teams[0]).toMatchObject({ win: true, kills: 0 + 1 + 2 + 3 + 4, gold: 50_000, towers: 9, dragons: 3, barons: 1 });
    expect(m.teams[1].participants).toHaveLength(5);
  });

  it("returns null when the player is not in the match", () => {
    expect(mapMatch(match(), "someone-else", champion)).toBeNull();
  });

  it("converts the millisecond durations of matches without an end timestamp", () => {
    const m = mapMatch(match({ gameDuration: 1_800_000, gameEndTimestamp: undefined }), "p0", champion)!;
    expect(m.durationSec).toBe(1800);
    expect(m.endedAt).toBe(1_700_000_000_000 + 1_800_000);
  });

  it("flags early surrenders as remakes", () => {
    const participants = Array.from({ length: 10 }, (_, i) => player(i, { gameEndedInEarlySurrender: true }));
    expect(mapMatch(match({ participants }), "p0", champion)!.remake).toBe(true);
  });

  it("groups Arena players by duo and orders duos by placement", () => {
    const participants = Array.from({ length: 8 }, (_, i) =>
      player(i, {
        teamPosition: "",
        playerSubteamId: Math.floor(i / 2) + 1,
        subteamPlacement: 4 - Math.floor(i / 2),
        win: Math.floor(i / 2) >= 2,
      }),
    );
    const m = mapMatch(match({ participants, queueId: 1700, teams: [] }), "p0", champion)!;
    expect(m.teams).toHaveLength(4);
    expect(m.teams.map((t) => t.placement)).toEqual([1, 2, 3, 4]);
    expect(m.teams[0].participants.map((p) => p.puuid)).toEqual(["p6", "p7"]);
    expect(m.me).toMatchObject({ placement: 4, position: null, teamId: 1 });
  });

  it("copes with sparse participants (bots, old matches)", () => {
    const bare: ParticipantDto = { puuid: "bot", championId: 1, champLevel: 1, teamId: 200, win: false, kills: 0, deaths: 0, assists: 0 };
    const m = mapMatch(match({ participants: [player(0), bare] }), "p0", champion)!;
    expect(m.teams[1].participants[0]).toMatchObject({
      gameName: "Unknown",
      tagLine: "",
      keystone: null,
      secondaryStyle: null,
      items: [0, 0, 0, 0, 0, 0, 0],
    });
  });
});

describe("mapRanked", () => {
  it("keeps the two Summoner's Rift queues, solo first, and drops the rest", () => {
    const ranked = mapRanked([
      { queueType: "RANKED_FLEX_SR", tier: "GOLD", rank: "II", leaguePoints: 40, wins: 10, losses: 8 },
      { queueType: "RANKED_TFT", tier: "GOLD", rank: "I", leaguePoints: 1, wins: 1, losses: 1 },
      { queueType: "RANKED_SOLO_5x5", tier: "DIAMOND", rank: "IV", leaguePoints: 7, wins: 90, losses: 80, hotStreak: true },
    ]);
    expect(ranked.map((r) => r.queue)).toEqual(["RANKED_SOLO_5x5", "RANKED_FLEX_SR"]);
    expect(ranked[0]).toMatchObject({ tier: "DIAMOND", division: "IV", lp: 7, hotStreak: true });
  });

  it("ignores entries with a tier it does not know", () => {
    expect(mapRanked([{ queueType: "RANKED_SOLO_5x5", tier: "MYTHIC", rank: "I", leaguePoints: 0, wins: 0, losses: 0 }])).toEqual([]);
  });
});

describe("mapLiveGame", () => {
  const game = mapLiveGame(
    {
      gameMode: "CLASSIC",
      gameQueueConfigId: 420,
      gameStartTime: 1_700_000_000_000,
      bannedChampions: [
        { championId: 55, teamId: 100 },
        { championId: -1, teamId: 100 },
        { championId: 99, teamId: 200 },
      ],
      participants: [
        { puuid: "a", riotId: "Hide on bush#KR1", teamId: 100, championId: 103, spell1Id: 4, spell2Id: 14, perks: { perkIds: [8112, 8139], perkSubStyle: 8200 } },
        { puuid: null, riotId: "", teamId: 200, championId: 64 },
        { riotId: "Annie Bot", bot: true, teamId: 200, championId: 1 },
      ],
    },
    champion,
  );

  it("splits players into sides and reads their loadout", () => {
    expect(game.teams.map((t) => t.id)).toEqual([100, 200]);
    expect(game.teams[0].players[0]).toMatchObject({
      championId: 103,
      rank: null,
      mastery: null,
      puuid: "a",
      gameName: "Hide on bush",
      tagLine: "KR1",
      spells: [4, 14],
      keystone: 8112,
      secondaryStyle: 8200,
    });
    expect(game).toMatchObject({ queueId: 420, startedAt: 1_700_000_000_000 });
  });

  it("copes with hidden players and bots", () => {
    expect(game.teams[1].players[0]).toMatchObject({ puuid: null, gameName: "Hidden player", tagLine: "", keystone: null });
    expect(game.teams[1].players[1]).toMatchObject({ gameName: "Annie Bot", tagLine: "" });
  });

  it("skips empty ban slots", () => {
    expect(game.teams[0].bans).toHaveLength(1);
    expect(game.teams[1].bans).toHaveLength(1);
  });

  it("treats a zero start time as still loading", () => {
    expect(mapLiveGame({ gameStartTime: 0, participants: [] }, champion).startedAt).toBeNull();
  });
});
