import { describe, expect, it } from "vitest";
import { maxOrder } from "../skills";
import { demoMatches, demoTimeline } from "../demo/generate";
import { mapTimeline } from "./mapper";
import type { TimelineDto } from "./types";

const frame = (minute: number, gold: number[], events: TimelineDto["info"]["frames"][number]["events"] = []) => ({
  timestamp: minute * 60_000,
  participantFrames: Object.fromEntries(gold.map((g, i) => [String(i + 1), { participantId: i + 1, totalGold: g }])),
  events,
});

describe("mapTimeline", () => {
  const dto: TimelineDto = {
    metadata: { participants: ["a", "b"] },
    info: {
      frames: [
        frame(0, [500, 500], [
          { type: "ITEM_PURCHASED", timestamp: 2_000, participantId: 1, itemId: 1055 },
          { type: "ITEM_PURCHASED", timestamp: 3_000, participantId: 1, itemId: 2003 },
          { type: "ITEM_UNDO", timestamp: 4_000, participantId: 1, beforeId: 2003, afterId: 0 },
          { type: "ITEM_PURCHASED", timestamp: 5_000, participantId: 2, itemId: 1056 },
        ]),
        frame(1, [900, 700], [
          { type: "SKILL_LEVEL_UP", timestamp: 61_000, participantId: 1, skillSlot: 1, levelUpType: "NORMAL" },
          { type: "SKILL_LEVEL_UP", timestamp: 62_000, participantId: 1, skillSlot: 4, levelUpType: "EVOLVE" },
          { type: "ELITE_MONSTER_KILL", timestamp: 90_500, killerId: 7, monsterType: "DRAGON" },
          { type: "ELITE_MONSTER_KILL", timestamp: 95_000, killerTeamId: 100, monsterType: "HORDE" },
          { type: "BUILDING_KILL", timestamp: 99_000, teamId: 200, buildingType: "TOWER_BUILDING" },
        ]),
      ],
    },
  };

  it("keeps gold per minute, purchases minus undos, and normal level-ups", () => {
    const t = mapTimeline(dto, "EUW1_1");
    expect(t.players[0]).toEqual({
      puuid: "a",
      gold: [500, 900],
      purchases: [{ at: 2, itemId: 1055 }],
      skills: [1],
    });
    expect(t.players[1].purchases).toEqual([{ at: 5, itemId: 1056 }]);
  });

  it("credits objectives to the team that took them", () => {
    expect(mapTimeline(dto, "EUW1_1").objectives).toEqual([
      { at: 91, teamId: 200, kind: "dragon" },
      { at: 95, teamId: 100, kind: "grubs" },
      { at: 99, teamId: 100, kind: "tower" },
    ]);
  });
});

describe("demoTimeline", () => {
  const region = { slug: "euw", defaultTag: "EUW" };
  const now = Date.UTC(2026, 10, 17, 12);
  const { matches } = demoMatches(region, "Buddy", "LOL", 0, 10, now);

  it("matches the scoreboard: final gold, items bought, one skill per level", () => {
    const match = matches.find((m) => !m.remake)!;
    const t = demoTimeline(region, "Buddy", "LOL", match.id, now)!;
    expect(t.players).toHaveLength(10);
    for (const p of match.teams.flatMap((x) => x.participants)) {
      const line = t.players.find((x) => x.puuid === p.puuid)!;
      expect(line.gold.at(-1)).toBe(p.gold);
      expect(line.skills).toHaveLength(p.champLevel);
      for (const item of p.items.slice(0, 6).filter((i) => i > 0)) {
        expect(line.purchases.map((x) => x.itemId)).toContain(item);
      }
    }
  });

  it("refuses other players' games and unknown ids", () => {
    expect(demoTimeline(region, "Someone", "Else", matches[0].id, now)).toBeNull();
    expect(demoTimeline(region, "Buddy", "LOL", "EUW1_123", now)).toBeNull();
  });
});

describe("maxOrder", () => {
  it("lists basic abilities by points, then by who got there first", () => {
    expect(maxOrder([1, 3, 2, 1, 1, 4, 1, 3, 1, 3, 4, 3, 3, 2, 2, 4, 2, 2])).toBe("Q > E > W");
    expect(maxOrder([2, 1])).toBe("W > Q");
  });
});
