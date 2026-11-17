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
  matchups: [
    { champion: "Ahri", position: "MIDDLE", opponent: "Zed", win: true },
    { champion: "Zed", position: "MIDDLE", opponent: "Ahri", win: false },
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

    it("keeps notes per player, newest first, and deletes them", async () => {
      const p = `noted-${run}`;
      const base = { puuid: p, regionSlug: "euw", riotId: "Someone#EUW", author: "Anil", tags: [], public: true };
      const first = await store.addNote({ ...base, body: "Plays safe early.", at: 1_000 });
      const second = await store.addNote({ ...base, author: "Mate", body: "Tilts after\nfirst death.", at: 2_000 });
      expect(first).not.toBe(second);

      const notes = await store.listNotes(p);
      expect(notes.map((n) => n.body)).toEqual(["Tilts after\nfirst death.", "Plays safe early."]);
      expect(notes[0]).toMatchObject({ author: "Mate", riotId: "Someone#EUW", regionSlug: "euw", at: 2_000 });

      expect(await store.noteSummaries([p, "nobody"])).toEqual({ [p]: { count: 2, tags: [] } });
      expect(await store.noteSummaries([])).toEqual({});
      expect(await store.deleteNote(first)).toBe(true);
      expect(await store.deleteNote(first)).toBe(false);
      expect(await store.deleteNote("not-a-number")).toBe(false);
      expect((await store.listNotes(p)).map((n) => n.id)).toEqual([second]);
    });

    it("keeps tags on notes and sums them up per player, most used first", async () => {
      const p = `tagged-${run}`;
      const base = { puuid: p, regionSlug: "euw", riotId: "Someone#EUW", author: "Anil", public: true };
      await store.addNote({ ...base, body: "", tags: ["toxic", "duo with Kaori"], at: 1_000 });
      await store.addNote({ ...base, body: "Again.", tags: ["inter", "toxic"], at: 2_000 });
      expect((await store.listNotes(p)).map((n) => n.tags)).toEqual([["inter", "toxic"], ["toxic", "duo with Kaori"]]);
      expect(await store.noteSummaries([p])).toEqual({ [p]: { count: 2, tags: ["toxic", "duo with Kaori", "inter"] } });
    });

    it("never lists or counts private notes", async () => {
      const p = `private-${run}`;
      const base = { puuid: p, regionSlug: "euw", riotId: "Someone#EUW", author: "Anil", tags: ["toxic"] };
      await store.addNote({ ...base, body: "Only for us.", public: false, at: 1_000 });
      await store.addNote({ ...base, body: "For everyone.", public: true, at: 2_000 });
      expect((await store.listNotes(p)).map((n) => n.body)).toEqual(["For everyone."]);
      expect(await store.noteSummaries([p])).toEqual({ [p]: { count: 1, tags: ["toxic"] } });
    });

    it("pins players, updates a pin, and unpins", async () => {
      const a = `pin-a-${run}`;
      const b = `pin-b-${run}`;
      await store.pinPlayer({ puuid: a, regionSlug: "euw", riotId: "A#EUW", pinnedBy: "Anil", at: 1_000 });
      await store.pinPlayer({ puuid: b, regionSlug: "tr", riotId: "B#TR1", pinnedBy: "Mate", at: 2_000 });
      await store.pinPlayer({ puuid: a, regionSlug: "euw", riotId: "A2#EUW", pinnedBy: "Mate", at: 3_000 });
      const mine = (await store.listPinned()).filter((x) => x.puuid.endsWith(run));
      expect(mine.map((x) => [x.puuid, x.riotId, x.at])).toEqual([[a, "A2#EUW", 1_000], [b, "B#TR1", 2_000]]);
      expect(await store.unpinPlayer(a)).toBe(true);
      expect(await store.unpinPlayer(a)).toBe(false);
      expect((await store.listPinned()).some((x) => x.puuid === a)).toBe(false);
    });

    it("keeps feedback, newest first, and deletes it", async () => {
      const a = await store.addFeedback({ body: `Love it ${run}`, contact: "", page: "/", at: Date.now() - 1000 });
      const b = await store.addFeedback({ body: `Bug ${run}`, contact: "me@example.com", page: "/champions", at: Date.now() });
      const mine = (await store.listFeedback(500)).filter((f) => f.body.endsWith(run));
      expect(mine.map((f) => f.body)).toEqual([`Bug ${run}`, `Love it ${run}`]);
      expect(mine[0]).toMatchObject({ contact: "me@example.com", page: "/champions" });
      expect(await store.listFeedback(1)).toHaveLength(1);
      expect(await store.deleteFeedback(a)).toBe(true);
      expect(await store.deleteFeedback(a)).toBe(false);
      expect(await store.deleteFeedback("x")).toBe(false);
      expect((await store.listFeedback(500)).some((f) => f.id === b)).toBe(true);
    });

    it("counts hits per window", async () => {
      const bucket = `rl-${run}`;
      expect(await store.countHits(bucket, 60_000, 1)).toBe(1);
      expect(await store.countHits(bucket, 60_000, 2)).toBe(3);
      expect(await store.countHits(bucket, 120_000, 1)).toBe(1);
      expect(await store.countHits(`${bucket}-other`, 60_000, 1)).toBe(1);
    });

    it("deletes rank snapshots older than a cutoff", async () => {
      const p = `old-${run}`;
      await store.recordRank(snap(1, 1_000, { puuid: p, wins: 1 }));
      await store.recordRank(snap(2, 5_000, { puuid: p, wins: 2 }));
      expect(await store.pruneRanks(3_000)).toBeGreaterThanOrEqual(1);
      expect((await store.rankHistory(p, "RANKED_SOLO_5x5", 0)).map((s) => s.lp)).toEqual([2]);
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

      expect(await store.championMatchups(patch, "Ahri")).toEqual([
        { position: "MIDDLE", opponent: "Zed", games: 2, wins: 2 },
      ]);
      expect(await store.championMatchups(patch, "Nobody")).toEqual([]);
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

  it("pairs each player with the enemy in the same position", () => {
    const m = matches.find((x) => x.queueId === 420 && !x.remake)!;
    const d = matchDelta(m, all)!;
    expect(d.matchups).toHaveLength(10);
    const [blue, red] = m.teams.map((t) => t.participants);
    const mid = blue.find((p) => p.position === "MIDDLE")!;
    const enemy = red.find((p) => p.position === "MIDDLE")!;
    expect(d.matchups).toContainEqual({ champion: mid.championKey, position: "MIDDLE", opponent: enemy.championKey, win: mid.win });
    expect(d.matchups).toContainEqual({ champion: enemy.championKey, position: "MIDDLE", opponent: mid.championKey, win: enemy.win });
  });
});
