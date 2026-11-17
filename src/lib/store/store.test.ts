import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { demoMatches } from "../demo/generate";
import { matchDelta } from "./delta";
import { MemoryStore } from "./memory";
import { PostgresStore } from "./postgres";
import type { MatchDelta, RankSnapshot, Store } from "./types";

const snap = (lp: number, at: number, extra: Partial<RankSnapshot> = {}): RankSnapshot => ({
  puuid: "p1",
  regionSlug: "euw",
  queue: "RANKED_SOLO_5x5",
  tier: "GOLD",
  division: "II",
  lp,
  wins: 10 + at,
  losses: 10,
  at,
  ...extra,
});

let counter = 0;
const delta = (patch: string, extra: Partial<MatchDelta> = {}): MatchDelta => ({
  matchId: `M${counter++}-${Math.random().toString(36).slice(2)}`,
  patch,
  champions: [
    { champion: "Ahri", position: "MIDDLE", win: true },
    { champion: "Zed", position: "MIDDLE", win: false },
  ],
  bans: ["Yasuo", "Yone"],
  picks: [
    { champion: "Ahri", kind: "item", choice: "6655", win: true },
    { champion: "Ahri", kind: "keystone", choice: "8112", win: true },
    { champion: "Zed", kind: "item", choice: "6692", win: false },
  ],
  ...extra,
});

function suite(name: string, make: () => Store) {
  describe(name, () => {
    const store = make();
    // Each run gets its own player and patch, so a reused database stays valid.
    const run = Math.random().toString(36).slice(2, 8);
    const puuid = `p-${run}`;
    const patch = `99.${Math.floor(Math.random() * 1e6)}`;

    it("keeps rank snapshots in order and skips unchanged ones", async () => {
      await store.recordRank(snap(10, 1000, { puuid, wins: 1000 }));
      await store.recordRank(snap(10, 2000, { puuid, wins: 1010 }));
      await store.recordRank(snap(10, 3000, { puuid, wins: 1010 })); // same as the last: skipped
      await store.recordRank(snap(35, 4000, { puuid, wins: 1011 }));
      await store.recordRank(snap(99, 5000, { puuid, queue: "RANKED_FLEX_SR" }));

      const history = await store.rankHistory(puuid, "RANKED_SOLO_5x5", 0);
      expect(history.map((s) => [s.lp, s.at])).toEqual([[10, 1000], [10, 2000], [35, 4000]]);
      expect(await store.rankHistory(puuid, "RANKED_SOLO_5x5", 2500)).toHaveLength(1);
      expect(await store.rankHistory(puuid, "RANKED_FLEX_SR", 0)).toHaveLength(1);
      expect(history[0]).toMatchObject({ tier: "GOLD", division: "II", regionSlug: "euw", wins: 1000 });
    });

    it("records a batch of ranks with the same rule", async () => {
      const a = `a-${run}`;
      const b = `b-${run}`;
      await store.recordRanks([]);
      await store.recordRanks([snap(1, 1000, { puuid: a, wins: 1 }), snap(2, 1000, { puuid: b, wins: 1 })]);
      // a unchanged (skipped), b changed (kept), and a new queue for a (kept).
      await store.recordRanks([
        snap(1, 2000, { puuid: a, wins: 1 }),
        snap(9, 2000, { puuid: b, wins: 2 }),
        snap(5, 2000, { puuid: a, wins: 1, queue: "RANKED_FLEX_SR" }),
      ]);
      expect((await store.rankHistory(a, "RANKED_SOLO_5x5", 0)).map((s) => s.lp)).toEqual([1]);
      expect((await store.rankHistory(b, "RANKED_SOLO_5x5", 0)).map((s) => s.lp)).toEqual([2, 9]);
      expect(await store.rankHistory(a, "RANKED_FLEX_SR", 0)).toHaveLength(1);
    });

    it("counts each match once", async () => {
      const d = delta(patch);
      expect(await store.recordMatch(d)).toBe(true);
      expect(await store.recordMatch(d)).toBe(false);
      expect(await store.recordMatch(delta(patch))).toBe(true);
      expect(await store.seenMatches([d.matchId, "never-seen"])).toEqual(new Set([d.matchId]));
      expect(await store.seenMatches([])).toEqual(new Set());
    });

    it("adds up champion stats, bans and picks", async () => {
      const { rows, bans } = await store.championTable(patch);
      const ahri = rows.find((r) => r.champion === "Ahri" && r.position === "MIDDLE");
      expect(ahri).toMatchObject({ games: 2, wins: 2 });
      expect(rows.find((r) => r.champion === "Zed")).toMatchObject({ games: 2, wins: 0 });
      expect(bans.get("Yasuo")).toBe(2);

      const detail = await store.championDetail(patch, "Ahri");
      expect(detail.positions).toEqual([{ position: "MIDDLE", games: 2, wins: 2 }]);
      expect(detail.bans).toBe(0);
      expect(detail.picks.find((p) => p.kind === "item")).toMatchObject({ choice: "6655", games: 2, wins: 2 });

      const patches = await store.patches();
      expect(patches.find((p) => p.patch === patch)?.matches).toBe(2);
    });

    it("lists patches newest first", async () => {
      const older = `${patch.split(".")[0]}.${Number(patch.split(".")[1]) - 1}`;
      await store.recordMatch(delta(older));
      const list = (await store.patches()).map((p) => p.patch);
      expect(list.indexOf(patch)).toBeLessThan(list.indexOf(older));
    });
  });
}

suite("MemoryStore", () => new MemoryStore());

describe("MemoryStore on disk", () => {
  const dir = mkdtempSync(join(tmpdir(), "buddy-store-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("survives a restart", async () => {
    const path = join(dir, "data.json");
    const first = new MemoryStore(path);
    await first.recordRank(snap(50, 1000));
    await first.recordMatch(delta("16.1"));
    await first.save();

    const second = new MemoryStore(path);
    expect(await second.rankHistory("p1", "RANKED_SOLO_5x5", 0)).toHaveLength(1);
    expect(await second.patches()).toEqual([{ patch: "16.1", matches: 1 }]);
  });
});

// Set TEST_DATABASE_URL to run the same checks against a real Postgres.
const pgUrl = process.env.TEST_DATABASE_URL;
if (pgUrl) {
  let pg: PostgresStore;
  suite("PostgresStore", () => (pg = new PostgresStore(pgUrl)));
  afterAll(() => pg?.close());
} else {
  it.skip("PostgresStore (set TEST_DATABASE_URL to run)", () => {});
}

describe("matchDelta", () => {
  const { matches } = demoMatches({ slug: "euw", defaultTag: "EUW" }, "Buddy", "LOL", 0, 60, Date.UTC(2026, 0, 15));
  const all = () => true;

  it("counts ranked solo games only", () => {
    for (const m of matches) {
      const d = matchDelta(m, all);
      if (m.queueId !== 420 || m.remake) expect(d).toBeNull();
      else expect(d?.champions).toHaveLength(10);
    }
  });

  it("records each player's build, keystone, rune tree and spells", () => {
    const m = matches.find((x) => x.queueId === 420 && !x.remake)!;
    const d = matchDelta(m, (id) => id !== 3340)!;
    const me = m.me;
    const mine = d.picks.filter((p) => p.champion === me.championKey);
    expect(mine.filter((p) => p.kind === "item").map((p) => Number(p.choice)).sort()).toEqual(
      [...new Set(me.items.slice(0, 6).filter((i) => i > 0 && i !== 3340))].sort(),
    );
    expect(mine.find((p) => p.kind === "spells")?.choice).toBe([...me.spells].sort((a, b) => a - b).join("+"));
    expect(d.bans).toHaveLength(10);
    expect(d.patch).toBe(m.patch);
  });
});
