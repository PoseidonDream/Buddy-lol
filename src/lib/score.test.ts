import { describe, expect, it } from "vitest";
import { demoMatches } from "./demo/generate";
import { ratePlayers } from "./score";
import type { ParticipantSummary, Position, TeamSummary } from "./types";

let seq = 0;
function player(extra: Partial<ParticipantSummary>): ParticipantSummary {
  return {
    puuid: `p${seq++}`, gameName: "P", tagLine: "T", championId: 1, championKey: "Annie", championName: "Annie",
    champLevel: 15, teamId: 100, win: true, position: "MIDDLE", kills: 3, deaths: 3, assists: 3, cs: 150, gold: 9000,
    damage: 12000, damageTaken: 12000, visionScore: 15, wardsPlaced: 0, wardsKilled: 0, controlWards: 0,
    items: [0, 0, 0, 0, 0, 0, 0], spells: [4, 14], keystone: null, secondaryStyle: null, largestMultiKill: 0,
    placement: null, score: 0, scoreRank: 0, badge: null,
    ...extra,
  };
}

function team(id: number, win: boolean, players: Partial<ParticipantSummary>[]): TeamSummary {
  const participants = players.map((p) => player({ teamId: id, win, ...p }));
  return {
    id, win, kills: participants.reduce((n, p) => n + p.kills, 0), gold: 0, towers: 0, dragons: 0, barons: 0,
    placement: null, participants,
  };
}

describe("ratePlayers", () => {
  it("gives the standout on each side the MVP and ACE badges", () => {
    const teams = [
      team(100, true, [{ kills: 12, deaths: 1, assists: 8, damage: 30000, gold: 15000, cs: 250 }, {}, {}]),
      team(200, false, [{ kills: 9, deaths: 2, assists: 4, damage: 26000, gold: 13000, cs: 240 }, {}, {}]),
    ];
    ratePlayers(teams);

    const [carry] = teams[0].participants;
    const [loserCarry] = teams[1].participants;
    expect(carry.badge).toBe("MVP");
    expect(carry.scoreRank).toBe(1);
    expect(loserCarry.badge).toBe("ACE");

    const everyone = teams.flatMap((t) => t.participants);
    expect(everyone.filter((p) => p.badge === "MVP")).toHaveLength(1);
    expect(everyone.filter((p) => p.badge === "ACE")).toHaveLength(1);
    expect(everyone.map((p) => p.scoreRank).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("keeps every score between 0 and 10", () => {
    const teams = [
      team(100, true, [{ kills: 40, deaths: 0, assists: 30, damage: 90000, gold: 30000, cs: 400, visionScore: 120, damageTaken: 80000 }]),
      team(200, false, [{ kills: 0, deaths: 20, assists: 0, damage: 0, gold: 0, cs: 0, visionScore: 0, damageTaken: 0 }]),
    ];
    ratePlayers(teams);
    expect(teams[0].participants[0].score).toBeLessThanOrEqual(10);
    expect(teams[0].participants[0].score).toBeGreaterThan(8);
    expect(teams[1].participants[0].score).toBe(0);
  });

  it("judges supports on vision and involvement rather than farm", () => {
    const line = (position: Position) => ({ position, kills: 1, deaths: 3, assists: 14, cs: 30, damage: 6000, gold: 7000, visionScore: 80 });
    const teams = [
      team(100, true, [line("UTILITY"), { kills: 14, assists: 1, cs: 250, damage: 25000, visionScore: 20 }]),
      team(200, false, [line("MIDDLE"), { kills: 6, cs: 250, damage: 25000, visionScore: 20 }]),
    ];
    ratePlayers(teams);
    // Same stat line: rated well as a support, poorly as a mid laner.
    expect(teams[0].participants[0].score).toBeGreaterThan(teams[1].participants[0].score + 1);
  });

  it("ignores a stat nobody registered instead of marking everyone down", () => {
    const rate = (mine: number, theirs: number) => {
      const teams = [team(100, true, [{ visionScore: mine }]), team(200, false, [{ visionScore: theirs }])];
      ratePlayers(teams);
      return teams[0].participants[0].score;
    };
    // Nobody warded (ARAM): about the same as a game where both did equally...
    expect(Math.abs(rate(0, 0) - rate(30, 30))).toBeLessThanOrEqual(0.2);
    // ...and better than being the one player who did not.
    expect(rate(0, 0)).toBeGreaterThan(rate(0, 30));
  });

  it("is applied to every sample game except remakes", () => {
    const { matches } = demoMatches({ slug: "euw", defaultTag: "EUW" }, "Buddy", "LOL", 0, 60, Date.UTC(2026, 0, 15));
    for (const m of matches) {
      const everyone = m.teams.flatMap((t) => t.participants);
      if (m.remake) {
        expect(everyone.every((p) => p.score === 0 && p.badge === null)).toBe(true);
        continue;
      }
      expect(everyone.find((p) => p.badge === "MVP")?.win).toBe(true);
      expect(everyone.find((p) => p.badge === "ACE")?.win).toBe(false);
      expect(m.me.scoreRank).toBeGreaterThan(0);
    }
  });
});
