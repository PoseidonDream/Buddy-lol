import { describe, expect, it } from "vitest";
import { parseRiotIdInput, profilePath, riotIdFromSlug, riotIdToSlug } from "./riot-id";

describe("parseRiotIdInput", () => {
  it("splits name and tag on the hash", () => {
    expect(parseRiotIdInput("Hide on bush#KR1", "EUW")).toEqual({
      gameName: "Hide on bush",
      tagLine: "KR1",
    });
  });

  it("uses the region's default tag when none is typed", () => {
    expect(parseRiotIdInput("Buddy", "EUW")).toEqual({ gameName: "Buddy", tagLine: "EUW" });
    expect(parseRiotIdInput("Buddy#", "NA1")).toEqual({ gameName: "Buddy", tagLine: "NA1" });
  });

  it("tidies whitespace", () => {
    expect(parseRiotIdInput("  Mid   Gap # NA1 ", "EUW")).toEqual({
      gameName: "Mid Gap",
      tagLine: "NA1",
    });
  });

  it("accepts non-Latin names and tags", () => {
    expect(parseRiotIdInput("페이커#한국", "KR1")).toEqual({ gameName: "페이커", tagLine: "한국" });
  });

  it("rejects input that cannot be a Riot ID", () => {
    expect(parseRiotIdInput("", "EUW")).toBeNull();
    expect(parseRiotIdInput("#EUW", "EUW")).toBeNull();
    expect(parseRiotIdInput("Buddy#no spaces", "EUW")).toBeNull();
    expect(parseRiotIdInput("a/b#EUW", "EUW")).toBeNull();
    expect(parseRiotIdInput("x".repeat(25), "EUW")).toBeNull();
  });
});

describe("slugs", () => {
  it("round-trips through the URL form", () => {
    const id = { gameName: "Mid Gap", tagLine: "NA1" };
    expect(riotIdToSlug(id)).toBe("Mid%20Gap-NA1");
    expect(riotIdFromSlug(riotIdToSlug(id))).toEqual(id);
    expect(riotIdFromSlug("Mid Gap-NA1")).toEqual(id);
  });

  it("splits on the last dash, since names may contain dashes", () => {
    expect(riotIdFromSlug("semi-colon-EUW")).toEqual({ gameName: "semi-colon", tagLine: "EUW" });
  });

  it("rejects slugs without a tag", () => {
    expect(riotIdFromSlug("Buddy")).toBeNull();
    expect(riotIdFromSlug("-EUW")).toBeNull();
    expect(riotIdFromSlug("Buddy-")).toBeNull();
    expect(riotIdFromSlug("%E0%A4%A-EUW")).not.toBeUndefined(); // malformed encoding must not throw
  });

  it("builds profile paths", () => {
    expect(profilePath("euw", { gameName: "Buddy", tagLine: "LOL" })).toBe("/summoner/euw/Buddy-LOL");
  });
});
