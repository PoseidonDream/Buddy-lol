import { describe, expect, it } from "vitest";
import { demoLadder, demoLadderRank } from "./demo/ladder";
import { ladderHref, parseLadderQuery } from "./ladder-url";

describe("ladder URLs", () => {
  it("reads the query string, with defaults for anything missing or unknown", () => {
    expect(parseLadderQuery({})).toEqual({ tier: "challenger", queue: "RANKED_SOLO_5x5", page: 1 });
    expect(parseLadderQuery({ tier: "master", queue: "flex", page: "4" })).toEqual({
      tier: "master",
      queue: "RANKED_FLEX_SR",
      page: 4,
    });
    expect(parseLadderQuery({ tier: "iron", queue: "aram", page: "-2" })).toEqual({
      tier: "challenger",
      queue: "RANKED_SOLO_5x5",
      page: 1,
    });
    expect(parseLadderQuery({ page: "2.5" }).page).toBe(1);
    expect(parseLadderQuery({ page: ["3", "4"] }).page).toBe(1);
  });

  it("writes short links that read back the same", () => {
    expect(ladderHref("euw")).toBe("/leaderboards/euw");
    const href = ladderHref("kr", { tier: "grandmaster", queue: "RANKED_FLEX_SR", page: 3 });
    expect(href).toBe("/leaderboards/kr?tier=grandmaster&queue=flex&page=3");
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseLadderQuery(params)).toEqual({ tier: "grandmaster", queue: "RANKED_FLEX_SR", page: 3 });
  });
});

describe("sample ladder", () => {
  const region = { slug: "euw", defaultTag: "EUW" };

  it("is sorted, sized by tier, and the tiers do not overlap", () => {
    const challenger = demoLadder(region, "challenger", "RANKED_SOLO_5x5");
    const grandmaster = demoLadder(region, "grandmaster", "RANKED_SOLO_5x5");
    expect(challenger).toHaveLength(300);
    expect(grandmaster).toHaveLength(700);
    expect(challenger.every((r, i) => i === 0 || challenger[i - 1].lp >= r.lp)).toBe(true);
    expect(challenger.at(-1)!.lp).toBeGreaterThan(grandmaster[0].lp);
  });

  it("is the same on every call, and different per region", () => {
    expect(demoLadder(region, "master", "RANKED_FLEX_SR")).toEqual(demoLadder(region, "master", "RANKED_FLEX_SR"));
    expect(demoLadder({ slug: "kr", defaultTag: "KR1" }, "challenger", "RANKED_SOLO_5x5")[0].puuid).not.toBe(
      demoLadder(region, "challenger", "RANKED_SOLO_5x5")[0].puuid,
    );
  });

  it("finds a ladder player by Riot ID, ignoring case", () => {
    const top = demoLadder(region, "challenger", "RANKED_SOLO_5x5")[0];
    const found = demoLadderRank(region, top.gameName!.toUpperCase(), top.tagLine!.toLowerCase());
    expect(found?.tier).toBe("challenger");
    expect(found?.row.lp).toBe(top.lp);
    expect(demoLadderRank(region, "Nobody Here", "EUW")).toBeNull();
  });
});
