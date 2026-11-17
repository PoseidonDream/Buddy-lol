# Buddy.lol

A League of Legends stats site: player profiles with rank, LP history, match
history (with gold graphs and build orders) and live games; Challenger to
Master leaderboards; a lobby multi-search; and a champion tier list with
builds and matchups. In English and Turkish, and installable on a phone.

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
| `CONTACT_URL`       | Where the privacy page sends questions, e.g. `mailto:you@example.com`.     |
| `NOTES_PASSWORD`    | Turns on private player notes and the feedback inbox; anyone with this password can use them. |
| `RIOT_VERIFICATION_CODE` | The code Riot asks you to host at `/riot.txt` when applying for a production key. |
| `RATE_LIMIT_PER_MINUTE` | Lookups one visitor may make per minute. Default 10.                    |
| `RATE_LIMIT_PER_HOUR`   | Lookups one visitor may make per hour. Default 100.                     |
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
| `/api/match/{region}/{matchId}/timeline`      | JSON, one game's gold per minute, purchases and skill order |
| `/api/cron/collect`                           | Runs the collector (see below)                             |

**A profile** shows the game the player is in right now (if any), solo and flex
rank, an LP history graph, a summary of recent games (win rate, form, KDA, kill
participation, CS, roles), and match history. Queue filters ask Riot for that
queue's games, so "Ranked Solo" reaches back past the games already loaded. Each
game shows a 0 to 10 score with MVP and ACE badges, and opens into three
tabs: the full scoreboard; **Gold**, the team's gold lead minute by minute
with dragons, Barons and Heralds marked; and **Build**, any player's item
order and skill order. The last two come from Riot's match timeline, fetched
when a tab is first opened. A **Played with** card lists the teammates a
player keeps queueing with, from the games loaded (and the queue filter).

**The score** measures each stat against the best in the game, weighted by role
(supports are judged on vision and involvement rather than farm). It is our own
heuristic, not something Riot publishes. See `src/lib/score.ts`.

**The live game** shows, for each player, their solo rank (flex if they have
no solo rank), LP, season win rate and mastery on the champion they picked,
plus each team's average rank. That costs two extra Riot requests per player.

**Notes** are private notes on players for the people running the site. Set
`NOTES_PASSWORD`; whoever enters it (with their name) can read, add and delete
notes on any profile. A note can carry quick tags (Toxic, Carry, Duo, or
anything typed), and the live game shows each noted player's tags. Without the
password nobody sees the notes or even the panel. Notes are stored in the same
database as everything else.

**Pinned players.** The notes box has a "Pin to home page" button. Pinned
players appear on the home page (only for people who have unlocked notes) with
their rank, LP and wins and losses over the last 24 hours, and a red dot while
they're in a game. The collector also saves their ranks on every run, so the
24-hour change stays accurate.

**Feedback.** With `NOTES_PASSWORD` set, every page has a "Send feedback"
button in the footer. Messages (plus the page they came from and an optional
contact) land in the inbox at `/feedback`, which opens with the same password.
Each address can send 5 an hour, and a hidden field catches simple bots.

**The tier list** grades champions on win rate pulled toward 50% by a hundred
games, so a champion needs both a good record and enough games to rank highly.
Champion pages also list the lane opponents a champion does best and worst
against in the chosen role, from the collected games.

**Languages.** The site is in English and Turkish. A visitor gets the language
their browser asks for, and the footer switches it (saved in a cookie). Links
starting `/tr/` or `/en/` switch too, so `https://buddy-lol.vercel.app/tr`
opens the site in Turkish. Champion, item, rune and spell names come from Data
Dragon in the same language.

**On a phone**, "Add to Home Screen" (Safari) or "Install app" (Chrome) puts
the site on the home screen, where it opens full screen like an app.

## Data that builds up over time

Riot's API only describes the present: a player's rank now, their recent games.
LP history and champion statistics have to be collected, so the site keeps:

- **Rank snapshots.** Saved whenever a profile is opened and the rank has
  changed since the last snapshot, and for every Challenger and Grandmaster
  player each time the collector runs. The LP graph draws from these, so a
  player's graph starts the first time anyone looks them up.
- **Champion statistics.** Every ranked solo game the site sees, from profiles
  or from the collector, adds to per-patch counts of picks, wins, bans, items,
  keystones, rune trees, summoner spells and lane matchups. Each game is
  counted once. Matchups started being counted with this version.

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
day, which is all Vercel's free plan allows. For a tier list that keeps up,
call it more often from a free scheduler such as cron-job.org:

- URL: `https://<your site>/api/cron/collect?budget=40`
- Schedule: every 10 minutes
- Header: `Authorization: Bearer <CRON_SECRET>`

A budget of 40 every 10 minutes uses under a tenth of a Personal key's
allowance, leaving the rest for visitors.

## Deploying to Vercel

1. Create a Postgres database (Neon's free tier works), in **Frankfurt**
   (AWS eu-central-1), and copy its pooled connection string.
2. Import the repository on Vercel and set `RIOT_API_KEY`, `DATABASE_URL` and
   `CRON_SECRET` (any long random text) before the first deploy.
3. Deploy. Every push to `main` deploys again.

`vercel.json` runs the site's functions in Frankfurt (`fra1`), next to both the
database and Riot's European servers, and schedules the collector once a day.
If you mostly look up players in another part of the world, move both the
database and the `regions` entry there; the further apart they are, the slower
every page that saves data.

A Personal API key is for you and people you know. Before sharing the site
publicly, apply for a Production key with its address.

## Running it publicly

What the site does to stay safe and within Riot's limits with strangers using it:

- **Per-visitor limits.** Every lookup that costs Riot requests (a profile, a
  page of matches, a leaderboard page, each multi-search card) counts against
  the visitor's IP address: 10 a minute and 100 an hour by default. Past that,
  pages say to wait a minute and the JSON API answers 429 with `Retry-After`.
  Counts are shared through the database, so they hold across Vercel's servers,
  and addresses are stored only as a salted hash and deleted within two days.
  Sample-data mode is never limited.
- **Crawlers.** `robots.txt` keeps search engines off profiles, multi-search,
  the API and leaderboard pages past the first, which would otherwise spend the
  key's allowance.
- **Security headers.** A Content Security Policy (scripts only from this site,
  images also from Data Dragon, no framing), plus `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and HSTS.
- **Collector.** Needs `CRON_SECRET`, compared in constant time. Each run also
  deletes rank snapshots older than 180 days.
- **Privacy page** at `/privacy`, linked from every page, saying what is kept
  and for how long. Set `CONTACT_URL` so people know where to send questions.

The Riot key's own limit is shared by everyone; when it runs out, pages say so
and recover within two minutes. A Production key raises it.

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
    pinned.ts, timeline.ts  Pinned players for the home page; match timelines.
    demo/                 Seeded sample data: profiles, games, ladders.
    ddragon.ts, assets.ts Data Dragon: patch, champion, item, rune and spell names; image URLs.
    types.ts              The shapes the UI renders. Live and sample data both produce these.
  i18n/                   Languages: en.ts and tr.ts hold every piece of text.
  proxy.ts                Picks each visitor's language and serves the page in it.
```

Pages live under `app/[lang]/`. The proxy rewrites `/champions` to
`/en/champions` or `/tr/champions` without changing the address. Server
components read text with `getDict()`, client components with `useDict()`. To
add text, add the key to `src/i18n/en.ts` and `src/i18n/tr.ts`; TypeScript
refuses a key that is missing from either.

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

- Rank distribution for a region, built from the collected snapshots
- More languages: add a dictionary next to `en.ts` and `tr.ts`
- A shared cache (Redis or similar) once this runs on more than one server
- A CI workflow running lint, tests and a build on every pull request

## Legal

Buddy.lol isn't endorsed by Riot Games and doesn't reflect the views or opinions
of Riot Games or anyone officially involved in producing or managing Riot Games
properties. Riot Games, and all associated properties are trademarks or
registered trademarks of Riot Games, Inc.
