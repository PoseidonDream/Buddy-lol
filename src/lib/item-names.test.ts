import { describe, expect, it } from "vitest";
import { demoMatches } from "./demo/generate";
import { collectItemNames } from "./item-names";

describe("collectItemNames", () => {
  const { matches, itemNames } = demoMatches({ slug: "euw", defaultTag: "EUW" }, "Buddy", "LOL", 0, 20, Date.UTC(2026, 0, 15));

  it("names every item that appears, and nothing else", () => {
    const seen = new Set(
      matches.flatMap((m) => m.teams.flatMap((t) => t.participants.flatMap((p) => p.items))).filter((id) => id > 0),
    );
    const names = collectItemNames(matches, (id) => `Item ${id}`);
    expect(Object.keys(names).map(Number).sort()).toEqual([...seen].sort());
    expect(names[0]).toBeUndefined();
  });

  it("leaves out items it has no name for", () => {
    expect(collectItemNames(matches, () => undefined)).toEqual({});
  });

  it("gives the sample data a name for every item it uses", () => {
    const seen = new Set(
      matches.flatMap((m) => m.teams.flatMap((t) => t.participants.flatMap((p) => p.items))).filter((id) => id > 0),
    );
    for (const id of seen) expect(itemNames[id], `item ${id}`).toBeTruthy();
  });
});
