import { describe, expect, it } from "vitest";
import { MAX_TAGS, cleanTags, tagTone } from "./note-tags";

describe("cleanTags", () => {
  it("maps typed names to presets and keeps custom text as typed", () => {
    expect(cleanTags(["Good jungler", " toxic ", "duo with  Kaori", "AFK"])).toEqual([
      "good-jungler",
      "toxic",
      "duo with Kaori",
      "afk",
    ]);
  });

  it("drops blanks and duplicates, and caps count and length", () => {
    expect(cleanTags(["", "  ", "toxic", "Toxic", "TOXIC"])).toEqual(["toxic"]);
    expect(cleanTags(["x".repeat(40)])).toEqual(["x".repeat(24)]);
    expect(cleanTags(Array.from({ length: 10 }, (_, i) => `t${i}`))).toHaveLength(MAX_TAGS);
  });

  it("matches names in other languages when given", () => {
    expect(cleanTags(["Zehirli"], [{ toxic: "Zehirli" }])).toEqual(["toxic"]);
  });

  it("colours presets by tone; custom tags are neutral", () => {
    expect(tagTone("toxic")).toBe("bad");
    expect(tagTone("carry")).toBe("good");
    expect(tagTone("anything")).toBe("neutral");
  });
});
