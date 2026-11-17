import "server-only";

import { Pool, type PoolClient } from "pg";
import type { Position, RankedQueue, Tier } from "../types";
import {
  summarizeNotes,
  type ChampionDetail,
  type MatchDelta,
  type MatchupRow,
  type PatchTotal,
  type Feedback,
  type PickKind,
  type PinnedPlayer,
  type PlayerNote,
  type RankSnapshot,
  type Store,
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
create table if not exists player_notes (
  id bigserial primary key,
  puuid text not null,
  region text not null,
  riot_id text not null,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists player_notes_puuid on player_notes (puuid);
alter table player_notes add column if not exists tags text[] not null default '{}';
alter table player_notes add column if not exists public boolean not null default false;
create table if not exists pinned_players (
  puuid text primary key,
  region text not null,
  riot_id text not null,
  pinned_by text not null,
  pinned_at timestamptz not null default now()
);
create table if not exists champion_matchups (
  patch text not null,
  champion text not null,
  position text not null,
  opponent text not null,
  games integer not null,
  wins integer not null,
  primary key (patch, champion, position, opponent)
);
create table if not exists feedback (
  id bigserial primary key,
  body text not null,
  contact text not null,
  page text not null,
  created_at timestamptz not null default now()
);
create table if not exists rate_hits (
  bucket text not null,
  window_start bigint not null,
  hits integer not null,
  primary key (bucket, window_start)
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

/**
 * pg currently treats sslmode=prefer, require and verify-ca as verify-full,
 * and warns that a future version will give them weaker libpq semantics.
 * Hosted databases such as Neon hand out `sslmode=require`; asking for
 * verify-full by name keeps today's strict checking, silences the warning,
 * and stays strict after that change. Everything else is left untouched.
 */
export function withStrictSsl(connectionString: string): string {
  return connectionString.replace(
    /([?&]sslmode=)(prefer|require|verify-ca)(?=&|#|$)/i,
    "$1verify-full",
  );
}

/** Postgres, used whenever DATABASE_URL is set. Creates its tables on first use. */
export class PostgresStore implements Store {
  readonly kind = "postgres";
  private pool: Pool;
  private ready: Promise<void> | null = null;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString: withStrictSsl(connectionString), max: 5 });
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

  async recordRanks(snapshots: RankSnapshot[]) {
    if (snapshots.length === 0) return;
    await this.schema();
    // Same rule as recordRank, for a whole ladder in one statement: insert each
    // snapshot that differs from that player's latest.
    await this.pool.query(
      `with input (puuid, region, queue, tier, division, lp, wins, losses, at) as (
         select * from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                              $6::int[], $7::int[], $8::int[], $9::float8[])
       ),
       latest as (
         select distinct on (r.puuid, r.queue) r.puuid, r.queue, r.tier, r.division, r.lp, r.wins, r.losses
         from rank_snapshots r join input i on r.puuid = i.puuid and r.queue = i.queue
         order by r.puuid, r.queue, r.taken_at desc
       )
       insert into rank_snapshots (puuid, region, queue, tier, division, lp, wins, losses, taken_at)
       select i.puuid, i.region, i.queue, i.tier, i.division, i.lp, i.wins, i.losses, to_timestamp(i.at / 1000.0)
       from input i left join latest l on l.puuid = i.puuid and l.queue = i.queue
       where l.puuid is null
          or (l.tier, l.division, l.lp, l.wins, l.losses)
             is distinct from (i.tier, i.division, i.lp, i.wins, i.losses)
       on conflict do nothing`,
      [
        snapshots.map((s) => s.puuid),
        snapshots.map((s) => s.regionSlug),
        snapshots.map((s) => s.queue),
        snapshots.map((s) => s.tier),
        snapshots.map((s) => s.division),
        snapshots.map((s) => s.lp),
        snapshots.map((s) => s.wins),
        snapshots.map((s) => s.losses),
        snapshots.map((s) => s.at),
      ],
    );
  }

  async addNote(n: Omit<PlayerNote, "id">) {
    await this.schema();
    const { rows } = await this.pool.query(
      `insert into player_notes (puuid, region, riot_id, author, body, tags, public, created_at)
       values ($1, $2, $3, $4, $5, $6::text[], $7, to_timestamp($8 / 1000.0)) returning id`,
      [n.puuid, n.regionSlug, n.riotId, n.author, n.body, n.tags, n.public, n.at],
    );
    return String(rows[0].id);
  }

  async listNotes(puuid: string) {
    await this.schema();
    const { rows } = await this.pool.query(
      `select id, puuid, region, riot_id, author, body, tags, extract(epoch from created_at) * 1000 as at
       from player_notes where puuid = $1 and public order by created_at desc, id desc limit 200`,
      [puuid],
    );
    return rows.map(
      (r): PlayerNote => ({
        id: String(r.id),
        puuid: r.puuid,
        regionSlug: r.region,
        riotId: r.riot_id,
        author: r.author,
        body: r.body,
        tags: r.tags ?? [],
        public: true,
        at: Math.round(Number(r.at)),
      }),
    );
  }

  async deleteNote(id: string) {
    if (!/^\d{1,18}$/.test(id)) return false;
    await this.schema();
    const result = await this.pool.query("delete from player_notes where id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async noteSummaries(puuids: string[]) {
    if (puuids.length === 0) return {};
    await this.schema();
    const { rows } = await this.pool.query(
      "select puuid, tags from player_notes where puuid = any($1::text[]) and public order by created_at, id",
      [puuids],
    );
    return summarizeNotes(rows.map((r) => ({ puuid: r.puuid as string, tags: (r.tags ?? []) as string[] })));
  }

  async pinPlayer(p: PinnedPlayer) {
    await this.schema();
    await this.pool.query(
      `insert into pinned_players (puuid, region, riot_id, pinned_by, pinned_at)
       values ($1, $2, $3, $4, to_timestamp($5 / 1000.0))
       on conflict (puuid) do update
       set region = excluded.region, riot_id = excluded.riot_id, pinned_by = excluded.pinned_by`,
      [p.puuid, p.regionSlug, p.riotId, p.pinnedBy, p.at],
    );
  }

  async unpinPlayer(puuid: string) {
    await this.schema();
    const result = await this.pool.query("delete from pinned_players where puuid = $1", [puuid]);
    return (result.rowCount ?? 0) > 0;
  }

  async listPinned() {
    await this.schema();
    const { rows } = await this.pool.query(
      `select puuid, region, riot_id, pinned_by, extract(epoch from pinned_at) * 1000 as at
       from pinned_players order by pinned_at, puuid`,
    );
    return rows.map(
      (r): PinnedPlayer => ({
        puuid: r.puuid,
        regionSlug: r.region,
        riotId: r.riot_id,
        pinnedBy: r.pinned_by,
        at: Math.round(Number(r.at)),
      }),
    );
  }

  async addFeedback(f: Omit<Feedback, "id">) {
    await this.schema();
    const { rows } = await this.pool.query(
      `insert into feedback (body, contact, page, created_at)
       values ($1, $2, $3, to_timestamp($4 / 1000.0)) returning id`,
      [f.body, f.contact, f.page, f.at],
    );
    return String(rows[0].id);
  }

  async listFeedback(limit: number) {
    await this.schema();
    const { rows } = await this.pool.query(
      `select id, body, contact, page, extract(epoch from created_at) * 1000 as at
       from feedback order by created_at desc, id desc limit $1`,
      [limit],
    );
    return rows.map(
      (r): Feedback => ({
        id: String(r.id),
        body: r.body,
        contact: r.contact,
        page: r.page,
        at: Math.round(Number(r.at)),
      }),
    );
  }

  async deleteFeedback(id: string) {
    if (!/^\d{1,18}$/.test(id)) return false;
    await this.schema();
    const result = await this.pool.query("delete from feedback where id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async pruneRanks(before: number) {
    await this.schema();
    const result = await this.pool.query(
      "delete from rank_snapshots where taken_at < to_timestamp($1 / 1000.0)",
      [before],
    );
    return result.rowCount ?? 0;
  }

  async countHits(bucket: string, windowStart: number, amount: number) {
    await this.schema();
    const { rows } = await this.pool.query(
      `insert into rate_hits (bucket, window_start, hits) values ($1, $2, $3)
       on conflict (bucket, window_start) do update set hits = rate_hits.hits + excluded.hits
       returning hits`,
      [bucket, windowStart, amount],
    );
    // Now and then, clear out windows that ended more than two days ago.
    if (Math.random() < 0.01) {
      void this.pool
        .query("delete from rate_hits where window_start < $1", [windowStart - 2 * 24 * 60 * 60 * 1000])
        .catch(() => {});
    }
    return rows[0].hits as number;
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
    if (d.matchups?.length) {
      await client.query(
        `insert into champion_matchups (patch, champion, position, opponent, games, wins)
         select $1, c, p, o, 1, w::int
         from unnest($2::text[], $3::text[], $4::text[], $5::boolean[]) as t(c, p, o, w)
         on conflict (patch, champion, position, opponent) do update
         set games = champion_matchups.games + 1, wins = champion_matchups.wins + excluded.wins`,
        [
          d.patch,
          d.matchups.map((m) => m.champion),
          d.matchups.map((m) => m.position),
          d.matchups.map((m) => m.opponent),
          d.matchups.map((m) => m.win),
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

  async championMatchups(patch: string, champion: string): Promise<MatchupRow[]> {
    await this.schema();
    const { rows } = await this.pool.query(
      `select position, opponent, games, wins from champion_matchups
       where patch = $1 and champion = $2`,
      [patch, champion],
    );
    return rows.map((r) => ({ ...r, position: r.position as Position }));
  }

  async close() {
    await this.pool.end();
  }
}
