# Buddy.lol

A League of Legends stats site: player profiles with rank, LP history, match
history and live games; Challenger to Master leaderboards; a lobby
multi-search; and a champion tier list with builds.

Built with Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS 4,
with optional Postgres.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

With no configuration the site runs on **sample data**: every profile,
leaderboard and tier list is generated, and a banner says so. That is enough to
work on the UI.

To use real data, get a key from the
[Riot Developer Portal](https://developer.riotgames.com) and put it in
`.env.local`:

```bash
cp .env.example .env.local
# then set RIOT_API_KEY=RGAPI-...
```

Development keys expire every 24 hours and allow 100 requests per 2 minutes. A
public site needs a production key, which Riot grants after reviewing the app.

| Command             | What it does                         |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Development server                   |
| `npm run build`     | Production build                     |
| `npm start`         | Serve the production build           |
| `npm test`          | Unit tests (Vitest)                  |
| `npm run lint`      | ESLint                               |
| `npm run typecheck` | Generate route types and run `tsc`   |

### Settings

All optional except the key. See `.env.example`.

| Variable            | What it does                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| `RIOT_API_KEY`      | Riot API key. Without it, everything is sample data.                        |
| `DATABASE_URL`      | Postgres connection string. Without it, data goes to `.data/buddy.json`.    |
| `CRON_SECRET`       | Protects the collector endpoint. Vercel Cron sends it automatically.        |
| `COLLECT_REGIONS`   | Regions the collector visits, comma separated. Default `euw`.               |
| `BUDDY_DATA_FILE`   | Where to keep the JSON file when there is no database.                      |
| `RIOT_API_BASE_URL` | Send Riot calls elsewhere (a caching proxy, a local stub).                  |

## What is here

| Route                                         | Purpose                                                    |
| --------------------------------------------- | ---------------------------------------------------------- |
| `/`                                           | Search, recently viewed players                            |
| `/summoner/{region}/{Name}-{TAG}`             | Player profile                                             |
| `/leaderboards/{region}`                      | Challenger, Grandmaster and Master, solo or flex           |
| `/multisearch`                                | Paste a lobby, see up to five players side by side         |
| `/champions`                                  | Tier list by role and patch                                |
| `/champions/{key}`                            | One champion: win, pick and ban rate; items, runes, spells |
| `/api/summoner/{region}/{Name}-{TAG}/matches` | JSON, a page of match history (`?start=10&queue=solo`)     |
| `/api/cron/collect`                           | Runs the collector (see below)                             |

**A profile** shows the game the player is in right now (if any), solo and flex
rank, an LP history graph, a summary of recent games (win rate, form, KDA, kill
participation, CS, roles), and match history. Queue filters ask Riot for that
queue's games, so "Ranked Solo" reaches back past the games already loaded. Each
game shows a 0 to 10 score with MVP and ACE badges, and expands into a full
scoreboard.

**The score** measures each stat against the best in the game, weighted by role
(supports are judged on vision and involvement rather than farm). It is our own
heuristic, not something Riot publishes. See `src/lib/score.ts`.

**The tier list** grades champions on win rate pulled toward 50% by a hundred
games, so a champion needs both a good record and enough games to rank highly.

## Data that builds up over time

Riot's API only describes the present: a player's rank now, their recent games.
LP history and champion statistics have to be collected, so the site keeps:

- **Rank snapshots.** Saved whenever a profile is opened and the rank has
  changed since the last snapshot, and for every Challenger and Grandmaster
  player each time the collector runs. The LP graph draws from these, so a
  player's graph starts the first time anyone looks them up.
- **Champion statistics.** Every ranked solo game the site sees, from profiles
  or from the collector, adds to per-patch counts of picks, wins, bans, items,
  keystones, rune trees and summoner spells. Each game is counted once.

Where it is kept:

- **Postgres**, when `DATABASE_URL` is set. Tables are created on first use. Any
  Postgres works; Neon and Supabase have free tiers.
- **Otherwise a JSON file**, `.data/buddy.json`. Fine on one computer, but hosts
  without a lasting disk (Vercel included) lose it, so use Postgres there.

### The collector

`/api/cron/collect` gathers ranked solo games from the top of the ladder. Each
run reads the Challenger and Grandmaster lists, saves those players' ranks, then
fetches recent games from a different handful of them each time, skipping games
already counted. It stops at a request budget (80 by default, `?budget=` to
change) so it never uses up the key's rate limit.

Run it by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/collect?region=euw"
```

In development it runs without the secret. `vercel.json` schedules it once a
day, which is all Vercel's free plan allows; for a tier list that keeps up,
call it more often from any scheduler (every 5 to 10 minutes stays within a
development key's limits).

## How it is put together

```
src/
  app/                    Routes. Pages load data and hand it to components.
  components/             UI, grouped by page: profile/, ladder/, multi/, champions/.
  lib/
    regions.ts            Servers, and which Riot API host each endpoint lives on.
    riot-id.ts, lobby.ts  Reading "Name#TAG", the URL form "Name-TAG", and pasted lobbies.
    riot/                 API client, endpoint wrappers, response types, and the
                          mapper from Riot's responses to our own types.
    profile.ts            Builds a profile: live from Riot, or sample data without a key.
    live.ts, ladder.ts    The current game, and leaderboards.
    score.ts              The per-game score.
    store/                Storage: the interface, Postgres and JSON-file versions,
                          and turning a game into statistics.
    record.ts             Saves ranks and games after a page is served.
    rank-history.ts       LP history; rank-scale.ts turns ranks into one number.
    champions.ts          Tier list and champion pages.
    collector.ts          The collector job.
    demo/                 Seeded sample data: profiles, games, ladders.
    ddragon.ts, assets.ts Data Dragon: patch, champion, item, rune and spell names; image URLs.
    types.ts              The shapes the UI renders. Live and sample data both produce these.
```

Things worth knowing before changing it:

- **The API key never reaches the browser.** All Riot calls happen on the server.
- **Riot responses are cached one by one**, through Next's `fetch` cache:
  finished matches for 30 days, names for a day, rank and summoner data for 2
  minutes, match lists for 1 minute, live games for 30 seconds. Leaderboards
  are kept in memory for 10 minutes because a Master list is too large for the
  fetch cache. A call that hits the per-second rate limit waits and retries once.
- **Riot's routing is two-level.** Summoner, league, mastery and spectator
  endpoints live on a platform host (`euw1`); account and match endpoints on a
  regional one (`europe`). `regions.ts` holds the mapping.
- **Pages stream.** Each page sends its frame at once and the data streams in
  behind `<Suspense>`; the live game and LP graph load separately so a slow
  answer never holds up a profile. The Next.js docs for the installed version
  are in `node_modules/next/dist/docs/`.
- **Sample data never reaches storage**, and real statistics are never mixed
  with generated games.
- **Tests:** `npm test` runs the unit tests. The storage tests also run against
  Postgres when `TEST_DATABASE_URL` is set.

## Ideas for later

- Match timelines: gold graphs and item build order (match-v5 timeline endpoint)
- Rank distribution for a region, built from the collected snapshots
- Champion matchups and counters from the collected games
- Other languages, since Data Dragon serves names in most of them
- A shared cache (Redis or similar) once this runs on more than one server
- A CI workflow running lint, tests and a build on every pull request

## Legal

Buddy.lol isn't endorsed by Riot Games and doesn't reflect the views or opinions
of Riot Games or anyone officially involved in producing or managing Riot Games
properties. Riot Games, and all associated properties are trademarks or
registered trademarks of Riot Games, Inc.
