import { describe, expect, it } from "vitest";
import { APEX_FLOOR, bandName, formatRank, rankFromValue, rankValue } from "./rank-scale";

describe("rank scale", () => {
  it("puts divisions 100 apart and tiers 400 apart", () => {
    expect(rankValue("IRON", "IV", 0)).toBe(0);
    expect(rankValue("IRON", "III", 0)).toBe(100);
    expect(rankValue("BRONZE", "IV", 0)).toBe(400);
    expect(rankValue("GOLD", "II", 54)).toBe(3 * 400 + 2 * 100 + 54);
    expect(rankValue("DIAMOND", "I", 99)).toBe(APEX_FLOOR - 1);
  });

  it("lets Master and above count LP from one floor", () => {
    expect(rankValue("MASTER", "I", 0)).toBe(APEX_FLOOR);
    expect(rankValue("CHALLENGER", "I", 1200)).toBe(APEX_FLOOR + 1200);
  });

  it("reads a value back as a rank", () => {
    for (const [tier, division, lp] of [["GOLD", "II", 54], ["IRON", "IV", 0], ["EMERALD", "I", 99]] as const) {
      expect(rankFromValue(rankValue(tier, division, lp))).toEqual({ tier, division, lp });
    }
    expect(rankFromValue(APEX_FLOOR + 640, "GRANDMASTER")).toEqual({ tier: "GRANDMASTER", division: "I", lp: 640 });
    expect(rankFromValue(-30)).toEqual({ tier: "IRON", division: "IV", lp: 0 });
  });

  it("names ranks and gridlines", () => {
    expect(formatRank({ tier: "GOLD", division: "II", lp: 54 })).toBe("Gold II · 54 LP");
    expect(formatRank({ tier: "MASTER", division: "I", lp: 212 })).toBe("Master · 212 LP");
    expect(bandName(1200, false)).toBe("Gold");
    expect(bandName(1300, true)).toBe("Gold III");
    expect(bandName(APEX_FLOOR, false)).toBe("Master");
  });
});
