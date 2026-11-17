# Buddy.lol

A League of Legends player lookup: search a Riot ID and see rank, recent form,
match history with full scoreboards, per-champion stats and mastery.

Built with Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS 4.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

With no configuration the site runs on **sample data**: every profile is
generated from the Riot ID you search for, and a banner says so. That is enough
to work on the UI.

To look up real players, get a key from the
[Riot Developer Portal](https://developer.riotgames.com) and put it in
`.env.local`:

```bash
cp .env.example .env.local
# then set RIOT_API_KEY=RGAPI-...
```

Development keys expire every 24 hours and allow 100 requests per 2 minutes.
Loading one profile for the first time costs 15 requests. A public site needs a
production key, which Riot grants after reviewing the app.

| Command             | What it does                         |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Development server                   |
| `npm run build`     | Production build                     |
| `npm start`         | Serve the production build           |
| `npm test`          | Unit tests (Vitest)                  |
| `npm run lint`      | ESLint                               |
| `npm run typecheck` | Generate route types and run `tsc`   |

## What is here

| Route                                         | Purpose                                 |
| --------------------------------------------- | --------------------------------------- |
| `/`                                           | Search, recently viewed players         |
| `/summoner/{region}/{Name}-{TAG}`             | Player profile                          |
| `/api/summoner/{region}/{Name}-{TAG}/matches` | JSON, one more page of match history (`?start=10`) |

A profile shows:

- Solo/Duo and Flex rank, LP and season win rate
- A summary of the loaded games: win rate, recent form, KDA, kill participation,
  CS per minute, roles played
- Match history, 10 games at a time, filterable by queue (each filter shows how
  many games it holds). Each game expands into a scoreboard with damage, gold,
  CS, vision and items for all ten players
- Tags on a game for multi-kills, the most damage dealt and a deathless game
- Win rate and KDA per champion over those games, and top champion mastery
- Item, spell, rune and champion names as tooltips

## How it is put together

```
src/
  app/                    Routes. Pages are thin: they load data and hand it to components.
  components/             UI. profile/ holds everything on the profile page.
  lib/
    regions.ts            Servers, and which Riot API host each endpoint lives on.
    riot-id.ts            Parsing "Name#TAG" and the URL form "Name-TAG".
    riot/                 API client, endpoint wrappers, response types, and the
                          mapper from Riot's responses to our own types.
    profile.ts            Builds a profile: live from Riot, or sample data without a key.
    demo/                 The seeded sample-data generator.
    ddragon.ts, assets.ts Data Dragon: current patch, champion names, image URLs.
    game-data.ts          Static tables: queues, tiers, summoner spells, keystones.
    stats.ts              Aggregates over a list of matches.
    types.ts              The shapes the UI renders. Both data sources produce these.
```

Things worth knowing before changing it:

- **The API key never reaches the browser.** All Riot calls happen on the server
  (`src/lib/riot/client.ts` is marked `server-only`).
- **Caching is per Riot request**, through Next's `fetch` cache: finished matches
  for 30 days, rank and summoner data for 2 minutes, match lists for 1 minute.
  Pressing *Update* re-renders the profile and refetches whatever has expired.
- **Rate limits.** A call that hits the per-second limit waits and retries once.
  Hitting the two-minute limit shows a "Too many lookups" page instead.
- **Riot's routing is two-level.** Summoner, league and mastery endpoints live on
  a platform host (`euw1`); account and match endpoints on a regional one
  (`europe`). `regions.ts` holds the mapping.
- **This is Next.js 16 with Cache Components.** Pages are prerendered shells with
  the data streamed in behind `<Suspense>`. The framework docs that match the
  installed version are in `node_modules/next/dist/docs/`.
- **Images come from Riot's Data Dragon CDN** and fall back to a text tile if one
  fails to load. Champion and item names come from Data Dragon too, with small
  built-in tables in `game-data.ts` as a fallback.

## Not built yet

Ideas for where to take it next, roughly easiest first:

- **Live game.** Whether the player is in a game right now, and who with
  (spectator API). One more request per profile.
- **Leaderboards.** Challenger, Grandmaster and Master ladders per region
  (league API). No database needed.
- **Queue filters that reach back in time.** Ask Riot for ranked games only,
  instead of filtering the games already loaded.
- **Multi-search.** Paste a champion-select lobby and see all five players.
- **A performance score per game** (the "MVP / ACE" badge other sites show).
- **Favourites**, kept in the browser like the recently viewed list.
- **Other languages.** Data Dragon serves names in most of them.
- **LP history graph.** Riot does not expose past LP, so this needs a database
  and a scheduled job that records each tracked player's rank.
- **Champion pages, tier lists and builds.** These need match data collected
  across many players over time, not fetched per request.
- **A shared cache** (Redis or similar) once this runs on more than one server,
  and a CI workflow that runs lint, tests and a build on every pull request.

## Legal

Buddy.lol isn't endorsed by Riot Games and doesn't reflect the views or opinions
of Riot Games or anyone officially involved in producing or managing Riot Games
properties. Riot Games, and all associated properties are trademarks or
registered trademarks of Riot Games, Inc.
