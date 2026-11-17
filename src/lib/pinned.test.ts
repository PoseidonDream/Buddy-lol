import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { changeSince, mainRank } from "./pinned";
import type { RankedEntry } from "./types";

const at = (tier: RankedEntry["tier"], division: string, lp: number, wins: number, losses: number, when: number) => ({
  tier,
  division,
  lp,
  wins,
  losses,
  at: when,
});

describe("changeSince", () => {
  const since = 10_000;

  it("compares with the last snapshot before the cut-off", () => {
    const history = [at("GOLD", "II", 10, 50, 50, 1_000), at("GOLD", "II", 30, 51, 50, 9_000), at("GOLD", "I", 5, 53, 51, 12_000)];
    expect(changeSince(history, { tier: "GOLD", division: "I", lp: 20, wins: 54, losses: 51 }, since)).toEqual({
      lp: 90,
      wins: 3,
      losses: 1,
    });
  });

  it("uses the first sighting when the player was first seen after the cut-off", () => {
    const history = [at("SILVER", "I", 80, 10, 10, 11_000)];
    expect(changeSince(history, { tier: "GOLD", division: "IV", lp: 0, wins: 12, losses: 10 }, since)).toEqual({
      lp: 20,
      wins: 2,
      losses: 0,
    });
  });

  it("knows nothing without history, or across a season reset", () => {
    expect(changeSince([], { tier: "GOLD", division: "I", lp: 0, wins: 1, losses: 0 }, since)).toBeNull();
    const history = [at("GOLD", "I", 0, 100, 90, 1_000)];
    expect(changeSince(history, { tier: "GOLD", division: "I", lp: 0, wins: 2, losses: 1 }, since)).toBeNull();
  });
});

describe("mainRank", () => {
  const entry = (queue: RankedEntry["queue"]): RankedEntry => ({
    queue,
    tier: "GOLD",
    division: "I",
    lp: 1,
    wins: 1,
    losses: 1,
    hotStreak: false,
  });
  it("prefers solo, then flex", () => {
    expect(mainRank([entry("RANKED_FLEX_SR"), entry("RANKED_SOLO_5x5")])?.queue).toBe("RANKED_SOLO_5x5");
    expect(mainRank([entry("RANKED_FLEX_SR")])?.queue).toBe("RANKED_FLEX_SR");
    expect(mainRank([])).toBeNull();
  });
});
