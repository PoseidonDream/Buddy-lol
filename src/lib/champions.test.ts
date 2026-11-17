import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { adjustedWinRate, minGamesFor, positionFromSlug, tierFor } from "./champions";

describe("champion tiers", () => {
  it("needs enough games before giving a tier", () => {
    expect(minGamesFor(0)).toBe(20);
    expect(minGamesFor(10_000)).toBe(50);
    expect(tierFor(15, 19, 20)).toBeNull();
    expect(tierFor(10, 20, 20)).not.toBeNull();
  });

  it("pulls small samples toward 50%", () => {
    expect(adjustedWinRate(9, 12)).toBeCloseTo(59 / 112);
    expect(adjustedWinRate(9, 12)).toBeLessThan(9 / 12);
    // The same record over more games keeps more of its edge.
    expect(adjustedWinRate(600, 1000)).toBeGreaterThan(adjustedWinRate(60, 100));
  });

  it("grades on the adjusted win rate", () => {
    expect(tierFor(580, 1000, 20)).toBe("S");
    expect(tierFor(520, 1000, 20)).toBe("A");
    expect(tierFor(500, 1000, 20)).toBe("B");
    expect(tierFor(485, 1000, 20)).toBe("C");
    expect(tierFor(440, 1000, 20)).toBe("D");
    // 70% over 30 games is promising, not proven.
    expect(tierFor(21, 30, 20)).toBe("S");
    expect(tierFor(14, 25, 20)).toBe("A");
  });

  it("reads role slugs", () => {
    expect(positionFromSlug("support")).toBe("UTILITY");
    expect(positionFromSlug("mid")).toBe("MIDDLE");
    expect(positionFromSlug("adc")).toBeNull();
  });
});
