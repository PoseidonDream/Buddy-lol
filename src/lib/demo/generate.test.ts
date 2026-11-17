import { describe, expect, it } from "vitest";
import { summarize } from "../stats";
import { demoMatches, demoProfile } from "./generate";

const region = { slug: "euw", defaultTag: "EUW" };
const NOW = Date.UTC(2026, 0, 15, 12);

describe("sample data", () => {
  it("is the same every time for the same Riot ID", () => {
    const a = demoProfile(region, "Buddy", "LOL", 10, "1.0.0", NOW);
    expect(demoProfile(region, "Buddy", "LOL", 10, "1.0.0", NOW)).toEqual(a);
    expect(demoProfile(region, "Someone Else", "LOL", 10, "1.0.0", NOW).puuid).not.toBe(a.puuid);
  });

  it("treats Riot IDs as case-insensitive, like the real API", () => {
    const a = demoProfile(region, "Buddy", "LOL", 10, "1.0.0", NOW);
    const b = demoProfile(region, "buddy", "lol", 10, "1.0.0", NOW);
    expect(b.puuid).toBe(a.puuid);
    expect(b.ranked).toEqual(a.ranked);
    expect(b.matches.map((m) => [m.id, m.me.kills])).toEqual(a.matches.map((m) => [m.id, m.me.kills]));
  });

  it("pages without gaps or repeats, and ends", () => {
    const first = demoProfile(region, "Buddy", "LOL", 10, "1.0.0", NOW);
    const second = demoMatches(region, "Buddy", "LOL", 10, 10, NOW + 5 * 60_000);
    const all = [...first.matches, ...second.matches];
    expect(new Set(all.map((m) => m.id)).size).toBe(20);
    expect(first.hasMoreMatches).toBe(true);
    // Newest first, across the page boundary.
    expect(all.map((m) => m.endedAt)).toEqual([...all.map((m) => m.endedAt)].sort((x, y) => y - x));
    expect(demoMatches(region, "Buddy", "LOL", 50, 10, NOW)).toMatchObject({ hasMore: false });
    expect(demoMatches(region, "Buddy", "LOL", 60, 10, NOW).matches).toEqual([]);
  });

  it("produces internally consistent games", () => {
    for (const name of ["Buddy", "Mid Gap", "Baron Thief", "x"]) {
      const { matches } = demoMatches(region, name, "EUW", 0, 60, NOW);
      for (const m of matches) {
        expect(m.teams).toHaveLength(2);
        const [a, b] = m.teams;
        expect(a.win).not.toBe(b.win);
        expect(m.endedAt).toBeLessThan(NOW);
        for (const team of m.teams) {
          const other = team === a ? b : a;
          expect(team.participants).toHaveLength(5);
          expect(team.participants.reduce((n, p) => n + p.kills, 0)).toBe(team.kills);
          expect(team.participants.reduce((n, p) => n + p.deaths, 0)).toBe(other.kills);
          for (const p of team.participants) expect(p.items).toHaveLength(7);
        }
        const champions = m.teams.flatMap((t) => t.participants.map((p) => p.championKey));
        expect(new Set(champions).size).toBe(10);
        expect(m.teams.flatMap((t) => t.participants).filter((p) => p.puuid === m.me.puuid)).toHaveLength(1);
      }
      // The summary should be computable and sane for whatever was generated.
      const s = summarize(matches);
      expect(s.wins + s.losses).toBe(s.games);
      expect(s.killParticipation).toBeGreaterThan(0);
      expect(s.killParticipation).toBeLessThanOrEqual(100);
    }
  });
});

describe("sample data consistency", () => {
  it("only has ranked games in queues the player holds a rank in", () => {
    const queueOf = { RANKED_SOLO_5x5: 420, RANKED_FLEX_SR: 440 } as const;
    const seen = { solo: 0, flex: 0, soloUnranked: 0, flexUnranked: 0 };

    for (let i = 0; i < 40; i++) {
      const profile = demoProfile(region, `Player ${i}`, "EUW", 60, "1.0.0", NOW);
      const ranked = new Set<number>(profile.ranked.map((r) => queueOf[r.queue]));
      for (const queue of [420, 440]) {
        const games = profile.matches.filter((m) => m.queueId === queue).length;
        if (!ranked.has(queue)) expect(games, `Player ${i}, queue ${queue}`).toBe(0);
      }
      seen[ranked.has(420) ? "solo" : "soloUnranked"]++;
      seen[ranked.has(440) ? "flex" : "flexUnranked"]++;
    }

    // The sample should cover every case, or the check above proves nothing.
    expect(Object.values(seen).every((n) => n > 0), JSON.stringify(seen)).toBe(true);
  });
});

describe("sample data by queue", () => {
  const all = demoMatches(region, "Buddy", "LOL", 0, 60, NOW).matches;

  it("pages through one queue's games only", () => {
    const solo = all.filter((m) => m.queueId === 420);
    const first = demoMatches(region, "Buddy", "LOL", 0, 10, NOW, "solo");
    const second = demoMatches(region, "Buddy", "LOL", 10, 10, NOW, "solo");

    expect(first.matches.map((m) => m.id)).toEqual(solo.slice(0, 10).map((m) => m.id));
    expect(second.matches.map((m) => m.id)).toEqual(solo.slice(10, 20).map((m) => m.id));
    expect(first.hasMore).toBe(solo.length > 10);
  });

  it("reports the end of a short queue", () => {
    const aram = all.filter((m) => m.queueId === 450);
    const page = demoMatches(region, "Buddy", "LOL", 0, 60, NOW, "aram");
    expect(page.matches).toHaveLength(aram.length);
    expect(page.hasMore).toBe(false);
  });
});

describe("sample lobbies", () => {
  it("never give another player the profile owner's name", () => {
    // "Mid Gap" is also in the pool of names for other players.
    const { matches } = demoMatches(region, "Mid Gap", "NA1", 0, 60, NOW);
    for (const m of matches) {
      const sameName = m.teams.flatMap((t) => t.participants).filter((p) => p.gameName === "Mid Gap");
      expect(sameName).toHaveLength(1);
    }
  });
});
