import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Position, RankedQueue } from "../types";
import {
  comparePatches,
  sameRank,
  type ChampionDetail,
  type ChampionRow,
  type MatchDelta,
  type PatchTotal,
  type PickKind,
  type RankSnapshot,
  type Store,
} from "./types";

/** Snapshots kept per player and queue; the oldest go first. */
const MAX_SNAPSHOTS = 400;
/** Match ids remembered for de-duplication. */
const MAX_SEEN = 100_000;

interface Counter {
  games: number;
  wins: number;
}

interface Data {
  version: 1;
  ranks: Record<string, RankSnapshot[]>;
  seen: string[];
  patches: Record<string, number>;
  /** patch -> "champion|position" -> counts */
  champions: Record<string, Record<string, Counter>>;
  /** patch -> champion -> bans */
  bans: Record<string, Record<string, number>>;
  /** patch -> "champion|kind|choice" -> counts */
  picks: Record<string, Record<string, Counter>>;
}

function empty(): Data {
  return { version: 1, ranks: {}, seen: [], patches: {}, champions: {}, bans: {}, picks: {} };
}

function bump(map: Record<string, Counter>, key: string, win: boolean) {
  const c = (map[key] ??= { games: 0, wins: 0 });
  c.games++;
  if (win) c.wins++;
}

/**
 * Keeps everything in memory. Given a path, it also loads from and saves to a
 * JSON file there, which is plenty for one person running the site locally.
 */
export class MemoryStore implements Store {
  readonly kind: "file" | "memory";
  private data: Data = empty();
  private seen = new Set<string>();
  private loaded: Promise<void>;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly path?: string) {
    this.kind = path ? "file" : "memory";
    this.loaded = path ? this.load(path) : Promise.resolve();
  }

  private async load(path: string) {
    try {
      const parsed = JSON.parse(await readFile(path, "utf8")) as Data;
      if (parsed.version === 1) {
        this.data = { ...empty(), ...parsed };
        this.seen = new Set(this.data.seen);
      }
    } catch {
      // No file yet, or unreadable: start empty.
    }
  }

  private scheduleSave() {
    if (!this.path || this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.save();
    }, 2000);
  }

  /** Write to a temporary file and rename, so a crash never leaves half a file. */
  async save() {
    if (!this.path) return;
    this.data.seen = [...this.seen].slice(-MAX_SEEN);
    try {
      await mkdir(dirname(this.path), { recursive: true });
      await writeFile(`${this.path}.tmp`, JSON.stringify(this.data));
      await rename(`${this.path}.tmp`, this.path);
    } catch (err) {
      console.warn(`Could not save ${this.path}; keeping data in memory only.`, err);
    }
  }

  async recordRank(snapshot: RankSnapshot) {
    await this.loaded;
    const key = `${snapshot.puuid}|${snapshot.queue}`;
    const list = (this.data.ranks[key] ??= []);
    const last = list.at(-1);
    if (last && sameRank(last, snapshot)) return;
    list.push(snapshot);
    if (list.length > MAX_SNAPSHOTS) list.splice(0, list.length - MAX_SNAPSHOTS);
    this.scheduleSave();
  }

  async rankHistory(puuid: string, queue: RankedQueue, since: number) {
    await this.loaded;
    return (this.data.ranks[`${puuid}|${queue}`] ?? []).filter((s) => s.at >= since);
  }

  async recordMatch(delta: MatchDelta) {
    await this.loaded;
    if (this.seen.has(delta.matchId)) return false;
    this.seen.add(delta.matchId);

    const { patch } = delta;
    this.data.patches[patch] = (this.data.patches[patch] ?? 0) + 1;
    const champions = (this.data.champions[patch] ??= {});
    for (const c of delta.champions) bump(champions, `${c.champion}|${c.position}`, c.win);
    const bans = (this.data.bans[patch] ??= {});
    for (const b of delta.bans) bans[b] = (bans[b] ?? 0) + 1;
    const picks = (this.data.picks[patch] ??= {});
    for (const p of delta.picks) bump(picks, `${p.champion}|${p.kind}|${p.choice}`, p.win);

    this.scheduleSave();
    return true;
  }

  async seenMatches(ids: string[]) {
    await this.loaded;
    return new Set(ids.filter((id) => this.seen.has(id)));
  }

  async patches(): Promise<PatchTotal[]> {
    await this.loaded;
    return Object.entries(this.data.patches)
      .map(([patch, matches]) => ({ patch, matches }))
      .sort((a, b) => comparePatches(a.patch, b.patch));
  }

  async championTable(patch: string) {
    await this.loaded;
    const rows: ChampionRow[] = Object.entries(this.data.champions[patch] ?? {}).map(
      ([key, c]) => {
        const [champion, position] = key.split("|");
        return { champion, position: position as Position, ...c };
      },
    );
    return { rows, bans: new Map(Object.entries(this.data.bans[patch] ?? {})) };
  }

  async championDetail(patch: string, champion: string): Promise<ChampionDetail> {
    await this.loaded;
    const positions = Object.entries(this.data.champions[patch] ?? {})
      .filter(([key]) => key.startsWith(`${champion}|`))
      .map(([key, c]) => ({ position: key.split("|")[1] as Position, ...c }));
    const picks = Object.entries(this.data.picks[patch] ?? {})
      .filter(([key]) => key.startsWith(`${champion}|`))
      .map(([key, c]) => {
        const [, kind, choice] = key.split("|");
        return { kind: kind as PickKind, choice, ...c };
      });
    return { positions, bans: this.data.bans[patch]?.[champion] ?? 0, picks };
  }
}
