import { describe, expect, it } from "vitest";
import { formatDuration, formatKda, kdaRatio, timeAgo } from "./format";
import { summarize } from "./stats";
import type { MatchSummary, ParticipantSummary } from "./types";

function me(extra: Partial<ParticipantSummary>): ParticipantSummary {
  return {
    puuid: "me", gameName: "Me", tagLine: "EUW", championId: 1, championKey: "Annie", championName: "Annie",
    champLevel: 18, teamId: 100, win: true, position: "MIDDLE", kills: 0, deaths: 0, assists: 0, cs: 0, gold: 0,
    damage: 0, damageTaken: 0, visionScore: 0, wardsPlaced: 0, wardsKilled: 0, controlWards: 0,
    items: [0, 0, 0, 0, 0, 0, 0], spells: [4, 14], keystone: null, secondaryStyle: null, largestMultiKill: 0, placement: null,
    ...extra,
  };
}

function game(id: string, player: Partial<ParticipantSummary>, teamKills: number, extra: Partial<MatchSummary> = {}): MatchSummary {
  const p = me(player);
  return {
    id, queueId: 420, gameMode: "CLASSIC", endedAt: 0, durationSec: 1800, remake: false, me: p,
    teams: [
      { id: 100, win: p.win, kills: teamKills, gold: 0, towers: 0, dragons: 0, barons: 0, placement: null, participants: [p] },
      { id: 200, win: !p.win, kills: 0, gold: 0, towers: 0, dragons: 0, barons: 0, placement: null, participants: [] },
    ],
    ...extra,
  };
}

describe("summarize", () => {
  const matches = [
    game("1", { win: true, kills: 10, deaths: 2, assists: 5, cs: 240 }, 30),
    game("2", { win: false, kills: 2, deaths: 6, assists: 3, cs: 180 }, 10),
    game("3", { win: true, kills: 4, deaths: 0, assists: 12, cs: 30, championKey: "Lulu", championName: "Lulu", position: "UTILITY" }, 20),
    game("4", { win: false }, 0, { remake: true, durationSec: 200 }),
  ];
  const s = summarize(matches);

  it("leaves remakes out of the record", () => {
    expect(s).toMatchObject({ games: 3, wins: 2, losses: 1 });
  });

  it("totals kills, deaths and assists", () => {
    expect(s).toMatchObject({ kills: 16, deaths: 8, assists: 20 });
    expect(s.killParticipation).toBe(60); // 36 of 60 team kills
    expect(s.csPerMin).toBeCloseTo(450 / 90);
  });

  it("ranks champions by games played", () => {
    expect(s.champions.map((c) => [c.championName, c.games, c.wins])).toEqual([
      ["Annie", 2, 1],
      ["Lulu", 1, 1],
    ]);
    expect(s.champions[0].csPerMin).toBeCloseTo(7);
  });

  it("counts every role, including unplayed ones", () => {
    expect(s.roles.map((r) => r.games)).toEqual([0, 0, 2, 0, 1]);
  });

  it("handles an empty list", () => {
    expect(summarize([])).toMatchObject({ games: 0, killParticipation: 0, csPerMin: 0, champions: [] });
  });
});

describe("formatting", () => {
  it("formats KDA, treating zero deaths as perfect", () => {
    expect(formatKda(kdaRatio(10, 4, 6))).toBe("4.00");
    expect(formatKda(kdaRatio(3, 0, 9))).toBe("Perfect");
  });

  it("formats durations", () => {
    expect(formatDuration(200)).toBe("3m 20s");
    expect(formatDuration(1805)).toBe("30m 05s");
    expect(formatDuration(3725)).toBe("1h 02m");
  });

  it("formats relative times", () => {
    const now = 1_000_000_000_000;
    expect(timeAgo(now - 20_000, now)).toBe("just now");
    expect(timeAgo(now - 5 * 60_000, now)).toBe("5m ago");
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe("3h ago");
    expect(timeAgo(now - 2 * 86_400_000, now)).toBe("2d ago");
    expect(timeAgo(now + 60_000, now)).toBe("just now"); // clock skew
  });
});
