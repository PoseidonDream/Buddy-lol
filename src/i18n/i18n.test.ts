import { describe, expect, it } from "vitest";
import { resolveLocale } from "./config";
import { dictionaries } from "./dictionaries";

describe("resolveLocale", () => {
  it("prefers a saved choice", () => {
    expect(resolveLocale("tr", "en-GB,en;q=0.9")).toBe("tr");
    expect(resolveLocale("en", "tr-TR")).toBe("en");
  });

  it("otherwise takes the browser's most wanted language we have", () => {
    expect(resolveLocale(undefined, "tr-TR,tr;q=0.9,en-US;q=0.8")).toBe("tr");
    expect(resolveLocale(undefined, "de-DE,de;q=0.9,tr;q=0.8,en;q=0.7")).toBe("tr");
    expect(resolveLocale(undefined, "en;q=0.5,tr;q=0.9")).toBe("tr");
    expect(resolveLocale(undefined, "de-DE")).toBe("en");
  });

  it("falls back to English for nothing or nonsense", () => {
    expect(resolveLocale(null, null)).toBe("en");
    expect(resolveLocale("xx", "")).toBe("en");
    expect(resolveLocale(undefined, "tr;q=0")).toBe("en");
  });
});

/** Every key path in an object, functions included as leaves. */
function paths(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe("dictionaries", () => {
  const { en, tr } = dictionaries;

  it("have the same keys in every language", () => {
    expect(paths(tr).sort()).toEqual(paths(en).sort());
  });

  it("say game terms the Turkish client's way", () => {
    expect(tr.game.tier("GOLD")).toBe("Altın");
    expect(tr.game.position("UTILITY")).toBe("Destek");
    expect(tr.game.queue(420)).toBe("Dereceli Tek/Çift");
    expect(tr.game.queue(450)).toBe("ARAM");
    expect(tr.game.queue(0, "CLASSIC")).toBe("Sihirdar Vadisi");
    expect(tr.game.regionName("euw")).toBe("Batı Avrupa");
    expect(tr.game.record(12, 8)).toBe("12G 8M");
    expect(tr.game.kda(null)).toBe("Kusursuz");
  });

  it("keep English output as it was", () => {
    expect(en.game.queue(420)).toBe("Ranked Solo");
    expect(en.game.tier("GRANDMASTER")).toBe("Grandmaster");
    expect(en.time.duration(34, 5)).toBe("34m 05s");
    expect(en.match.place(2)).toBe("2nd place");
  });
});
