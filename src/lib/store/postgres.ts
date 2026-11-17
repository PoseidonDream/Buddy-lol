import "server-only";

import { Pool, type PoolClient } from "pg";
import type { Position, RankedQueue, Tier } from "../types";
import type {
  ChampionDetail,
  MatchDelta,
  PatchTotal,
  PickKind,
  RankSnapshot,
  Store,
} from "./types";

const SCHEMA = `
create table if not exists rank_snapshots (
  puuid text not null,
  region text not null,
  queue text not null,
  tier text not null,
  division text not null,
  lp integer not null,
  wins integer not null,
  losses integer not null,
  taken_at timestamptz not null,
  primary key (puuid, queue, taken_at)
);
create table if not exists seen_matches (
  match_id text primary key,
  patch text not null,
  seen_at timestamptz not null default now()
);
create table if not exists patch_totals (
  patch text primary key,
  matches integer not null
);
create table if not exists champion_stats (
  patch text not null,
  champion text not null,
  position text not null,
  games integer not null,
  wins integer not null,
  primary key (patch, champion, position)
);
create table if not exists champion_bans (
  patch text not null,
  champion text not null,
  bans integer not null,
  primary key (patch, champion)
);
create table if not exists champion_picks (
  patch text not null,
  champion text not null,
  kind text not null,
  choice text not null,
  games integer not null,
  wins integer not null,
  primary key (patch, champion, kind, choice)
);
`;

/** Postgres, used whenever DATABASE_URL is set. Creates its tables on first use. */
export class PostgresStore implements Store {
  readonly kind = "postgres";
  private pool: Pool;
  private ready: Promise<void> | null = null;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 5 });
  }

  private schema() {
    // Retried on the next call if it fails (the database may just be waking up).
    this.ready ??= this.pool.query(SCHEMA).then(
      () => undefined,
      (err) => {
        this.ready = null;
        throw err;
      },
    );
    return this.ready;
  }

  async recordRank(s: RankSnapshot) {
    await this.schema();
    // Insert only if the latest snapshot differs.
    await this.pool.query(
      `insert into rank_snapshots (puuid, region, queue, tier, division, lp, wins, losses, taken_at)
       select $1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9 / 1000.0)
       where not exists (
         select 1 from (
           select tier, division, lp, wins, losses from rank_snapshots
           where puuid = $1 and queue = $3 order by taken_at desc limit 1
         ) last
         where last.tier = $4 and last.division = $5 and last.lp = $6
           and last.wins = $7 and last.losses = $8
       )
       on conflict do nothing`,
      [s.puuid, s.regionSlug, s.queue, s.tier, s.division, s.lp, s.wins, s.losses, s.at],
    );
  }

  async rankHistory(puuid: string, queue: RankedQueue, since: number) {
    await this.schema();
    const { rows } = await this.pool.query(
      `select region, tier, division, lp, wins, losses,
              extract(epoch from taken_at) * 1000 as at
       from rank_snapshots
       where puuid = $1 and queue = $2 and taken_at >= to_timestamp($3 / 1000.0)
       order by taken_at`,
      [puuid, queue, since],
    );
    return rows.map(
      (r): RankSnapshot => ({
        puuid,
        queue,
        regionSlug: r.region,
        tier: r.tier as Tier,
        division: r.division,
        lp: r.lp,
        wins: r.wins,
        losses: r.losses,
        at: Math.round(Number(r.at)),
      }),
    );
  }

  async recordMatch(delta: MatchDelta) {
    await this.schema();
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const claimed = await client.query(
        "insert into seen_matches (match_id, patch) values ($1, $2) on conflict do nothing",
        [delta.matchId, delta.patch],
      );
      if (claimed.rowCount === 0) {
        await client.query("rollback");
        return false;
      }
      await this.addCounts(client, delta);
      await client.query("commit");
      return true;
    } catch (err) {
      await client.query("rollback").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  private async addCounts(client: PoolClient, d: MatchDelta) {
    await client.query(
      `insert into patch_totals (patch, matches) values ($1, 1)
       on conflict (patch) do update set matches = patch_totals.matches + 1`,
      [d.patch],
    );
    await client.query(
      `insert into champion_stats (patch, champion, position, games, wins)
       select $1, c, p, 1, w::int from unnest($2::text[], $3::text[], $4::boolean[]) as t(c, p, w)
       on conflict (patch, champion, position) do update
       set games = champion_stats.games + 1, wins = champion_stats.wins + excluded.wins`,
      [
        d.patch,
        d.champions.map((c) => c.champion),
        d.champions.map((c) => c.position),
        d.champions.map((c) => c.win),
      ],
    );
    if (d.bans.length) {
      await client.query(
        `insert into champion_bans (patch, champion, bans)
         select $1, c, 1 from unnest($2::text[]) as t(c)
         on conflict (patch, champion) do update set bans = champion_bans.bans + 1`,
        [d.patch, d.bans],
      );
    }
    if (d.picks.length) {
      await client.query(
        `insert into champion_picks (patch, champion, kind, choice, games, wins)
         select $1, c, k, ch, 1, w::int
         from unnest($2::text[], $3::text[], $4::text[], $5::boolean[]) as t(c, k, ch, w)
         on conflict (patch, champion, kind, choice) do update
         set games = champion_picks.games + 1, wins = champion_picks.wins + excluded.wins`,
        [
          d.patch,
          d.picks.map((p) => p.champion),
          d.picks.map((p) => p.kind),
          d.picks.map((p) => p.choice),
          d.picks.map((p) => p.win),
        ],
      );
    }
  }

  async seenMatches(ids: string[]) {
    if (ids.length === 0) return new Set<string>();
    await this.schema();
    const { rows } = await this.pool.query(
      "select match_id from seen_matches where match_id = any($1::text[])",
      [ids],
    );
    return new Set(rows.map((r) => r.match_id as string));
  }

  async patches(): Promise<PatchTotal[]> {
    await this.schema();
    const { rows } = await this.pool.query(
      `select patch, matches from patch_totals
       order by split_part(patch, '.', 1)::int desc, split_part(patch, '.', 2)::int desc`,
    );
    return rows;
  }

  async championTable(patch: string) {
    await this.schema();
    const [stats, bans] = await Promise.all([
      this.pool.query(
        "select champion, position, games, wins from champion_stats where patch = $1",
        [patch],
      ),
      this.pool.query("select champion, bans from champion_bans where patch = $1", [patch]),
    ]);
    return {
      rows: stats.rows.map((r) => ({ ...r, position: r.position as Position })),
      bans: new Map<string, number>(bans.rows.map((r) => [r.champion, r.bans])),
    };
  }

  async championDetail(patch: string, champion: string): Promise<ChampionDetail> {
    await this.schema();
    const [positions, bans, picks] = await Promise.all([
      this.pool.query(
        "select position, games, wins from champion_stats where patch = $1 and champion = $2",
        [patch, champion],
      ),
      this.pool.query("select bans from champion_bans where patch = $1 and champion = $2", [
        patch,
        champion,
      ]),
      this.pool.query(
        "select kind, choice, games, wins from champion_picks where patch = $1 and champion = $2",
        [patch, champion],
      ),
    ]);
    return {
      positions: positions.rows.map((r) => ({ ...r, position: r.position as Position })),
      bans: bans.rows[0]?.bans ?? 0,
      picks: picks.rows.map((r) => ({ ...r, kind: r.kind as PickKind })),
    };
  }

  async close() {
    await this.pool.end();
  }
}
