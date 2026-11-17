/**
 * Sample-data generator. Without a Riot API key the app has nothing real to
 * show, so it builds a plausible, clearly labelled profile from the Riot ID
 * instead. Everything is derived from a seed: the same ID gives the same
 * player, and paging through match history is stable.
 */

import { CHAMPION_POOL, ITEM_NAMES, POSITIONS, TIERS } from "../game-data";
import { collectItemNames } from "../item-names";
import type {
  MasteryEntry,
  MatchPage,
  MatchSummary,
  ParticipantSummary,
  Position,
  Profile,
  RankedEntry,
  TeamSummary,
  Tier,
} from "../types";
import { riotIdToSlug } from "../riot-id";
import { Rng, hashString } from "./random";

const TOTAL_MATCHES = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

type Champ = (typeof CHAMPION_POOL)[number];
type Archetype = "marksman" | "mage" | "assassin" | "fighter" | "tank" | "enchanter";

// Champions whose archetype is not the usual one for their role.
const ARCHETYPE_OVERRIDES: Record<string, Archetype> = {
  Ornn: "tank", Malphite: "tank", KSante: "tank",
  Khazix: "assassin", Elise: "mage", Nidalee: "mage", Ekko: "assassin", MasterYi: "assassin",
  Zed: "assassin", Yasuo: "fighter", Yone: "fighter", Akali: "assassin", Katarina: "assassin",
  Lulu: "enchanter", Milio: "enchanter", Senna: "enchanter", Morgana: "enchanter", Pyke: "assassin",
};

const ROLE_ARCHETYPE: Record<Position, Archetype> = {
  TOP: "fighter",
  JUNGLE: "fighter",
  MIDDLE: "mage",
  BOTTOM: "marksman",
  UTILITY: "tank",
};

function archetypeOf(c: Champ): Archetype {
  return ARCHETYPE_OVERRIDES[c.key] ?? ROLE_ARCHETYPE[c.position];
}

const BUILDS: Record<Archetype, { boots: number[]; items: number[]; keystones: number[]; secondary: number[] }> = {
  marksman: { boots: [3006], items: [3031, 6672, 3094, 3036, 3072, 3046, 3085, 3153, 3026], keystones: [8008, 8005, 8021], secondary: [8100, 8300, 8200] },
  mage: { boots: [3020], items: [3089, 3157, 3135, 4645, 6655, 6653, 3165, 3102, 3100, 3116], keystones: [8112, 8229, 8214, 8230], secondary: [8300, 8000, 8100] },
  assassin: { boots: [3158, 3020], items: [3142, 6692, 3814, 6694, 3071, 3026, 3156], keystones: [8112, 8128, 8010, 9923], secondary: [8000, 8300, 8200] },
  fighter: { boots: [3047, 3111], items: [3078, 3053, 3071, 3074, 3748, 6333, 3065, 3026], keystones: [8010, 8437, 8005], secondary: [8400, 8300, 8100] },
  tank: { boots: [3047, 3111], items: [3068, 3075, 3143, 3110, 3742, 3083, 3065, 4401, 3190], keystones: [8439, 8437, 8465], secondary: [8300, 8000] },
  enchanter: { boots: [3158], items: [3504, 6617, 3107, 3222, 2065, 4005], keystones: [8214, 8465, 8229], secondary: [8400, 8300] },
};

const SUPPORT_ITEMS = [3877, 3876, 3869, 3870, 3871];

const NAMES = [
  "Baron Thief", "Mid Gap", "Ward Bot", "Tilt Proof", "Scuttle Tax", "Cannon Minion",
  "Flash on D", "No Mana", "Late Smite", "Greedy Recall", "Fog Walker", "Split Push",
  "Wave Manager", "Herald Enjoyer", "One Trick", "Dragon Soul", "Blue Buff Pls",
  "Peel Me", "Roam Timer", "Tower Dive", "Free Elo", "Quiet Carry", "Nexus Hugger",
  "Lane Kingdom", "Sidelane", "Pink Ward", "First Timing", "Jungle Diff", "Honor Five",
  "Minion Block", "Silver Scrapes", "Backdoor", "Autofilled", "Skillshot", "Fountain",
  "Vision Score", "Krug Camp", "Double Buffs", "Front to Back", "Last Hitter",
];

interface Persona {
  seed: string;
  puuid: string;
  gameName: string;
  tagLine: string;
  defaultTag: string;
  mainRole: Position;
  offRole: Position;
  pool: Champ[];
  /** Chance to win any given game, 0.44 - 0.60. */
  skill: number;
  /** Which ranked queues the player takes part in. Unranked queues get no games. */
  playsSolo: boolean;
  playsFlex: boolean;
}

function championsFor(position: Position): Champ[] {
  return CHAMPION_POOL.filter((c) => c.position === position);
}

function persona(regionSlug: string, gameName: string, tagLine: string, defaultTag: string): Persona {
  const seed = `${regionSlug}:${gameName.toLowerCase()}#${tagLine.toLowerCase()}`;
  const rng = new Rng(seed);
  const [mainRole, offRole] = rng.shuffle(POSITIONS);
  const pool = [
    ...rng.shuffle(championsFor(mainRole)).slice(0, 4),
    ...rng.shuffle(championsFor(offRole)).slice(0, 2),
  ];
  return {
    seed,
    puuid: `demo-${hashString(seed).toString(16)}`,
    gameName,
    tagLine,
    defaultTag,
    mainRole,
    offRole,
    pool,
    skill: rng.range(0.44, 0.6),
    playsSolo: rng.chance(0.92),
    playsFlex: rng.chance(0.6),
  };
}

// --------------------------------------------------------------- matches

const SPELLS_BY_ROLE: Record<Position, [number, number][]> = {
  TOP: [[4, 12], [4, 14], [6, 12]],
  JUNGLE: [[11, 4]],
  MIDDLE: [[4, 14], [4, 12]],
  BOTTOM: [[4, 7], [4, 21], [4, 1]],
  UTILITY: [[4, 14], [4, 3], [4, 7]],
};

// Per-role baselines: [cs/min, damage/min, damage taken/min, vision/min, kill share, assist rate]
const ROLE_STATS: Record<Position, [number, number, number, number, number, number]> = {
  TOP: [7.2, 640, 900, 0.75, 1, 0.38],
  JUNGLE: [5.9, 560, 1000, 1.15, 1.05, 0.52],
  MIDDLE: [7.6, 800, 620, 0.85, 1.25, 0.42],
  BOTTOM: [8.1, 860, 560, 0.8, 1.35, 0.42],
  UTILITY: [1.2, 330, 610, 2.6, 0.3, 0.68],
};

function buildItems(rng: Rng, champ: Champ, role: Position | null, minutes: number): number[] {
  const build = BUILDS[archetypeOf(champ)];
  const finished = Math.max(0, Math.min(5, Math.floor((minutes - 6) / 5.5)));
  const items = [rng.pick(build.boots), ...rng.shuffle(build.items).slice(0, finished)];
  if (role === "UTILITY") items.splice(1, 0, rng.pick(SUPPORT_ITEMS));
  const slots = items.slice(0, 6);
  while (slots.length < 6) slots.push(0);
  const trinket = role === null ? 2052 : role === "UTILITY" || role === "JUNGLE" ? 3364 : rng.pick([3340, 3340, 3363]);
  return [...slots, trinket];
}

interface Seat {
  champ: Champ;
  role: Position | null;
  gameName: string;
  tagLine: string;
  puuid: string;
}

function buildTeam(
  rng: Rng,
  seats: Seat[],
  teamId: number,
  win: boolean,
  kills: number,
  deaths: number,
  minutes: number,
  aram: boolean,
): TeamSummary {
  const stats = seats.map((s) => ROLE_STATS[s.role ?? s.champ.position]);
  const killWeights = stats.map((s) => (aram ? 1 : s[4]) * rng.range(0.6, 1.4));
  const deathWeights = stats.map(() => rng.range(0.6, 1.4));
  const killsBy = seats.map(() => 0);
  const deathsBy = seats.map(() => 0);
  for (let i = 0; i < kills; i++) killsBy[rng.weighted(killWeights)]++;
  for (let i = 0; i < deaths; i++) deathsBy[rng.weighted(deathWeights)]++;

  const pace = (win ? 1.06 : 0.94) * (aram ? 1.5 : 1);

  const participants = seats.map((seat, i): ParticipantSummary => {
    const [csMin, dmgMin, takenMin, visMin, , assistRate] = stats[i];
    const k = killsBy[i];
    const build = BUILDS[archetypeOf(seat.champ)];
    const assists = Math.round((kills - k) * (aram ? 0.6 : assistRate) * rng.range(0.75, 1.25));
    const cs = Math.round(minutes * (aram ? csMin * 0.5 + 1.5 : csMin) * rng.range(0.82, 1.15));
    return {
      puuid: seat.puuid,
      gameName: seat.gameName,
      tagLine: seat.tagLine,
      championId: seat.champ.id,
      championKey: seat.champ.key,
      championName: seat.champ.name,
      champLevel: Math.min(18, Math.max(3, Math.round(4 + minutes * 0.43) - (seat.role === "UTILITY" ? 2 : 0))),
      teamId,
      win,
      position: seat.role,
      kills: k,
      deaths: deathsBy[i],
      assists,
      cs,
      gold: Math.round(minutes * (seat.role === "UTILITY" ? 230 : 300) * pace + cs * 21 + k * 300 + assists * 90),
      damage: Math.round(minutes * dmgMin * pace * rng.range(0.7, 1.4)),
      damageTaken: Math.round(minutes * takenMin * (aram ? 1.4 : 1) * rng.range(0.75, 1.3)),
      visionScore: aram ? 0 : Math.round(minutes * visMin * rng.range(0.75, 1.3)),
      wardsPlaced: aram ? 0 : Math.round(minutes * visMin * 0.45),
      wardsKilled: aram ? 0 : Math.round(minutes * visMin * 0.14),
      controlWards: aram ? 0 : rng.int(0, seat.role === "UTILITY" ? 8 : 4),
      items: buildItems(rng, seat.champ, aram ? null : seat.role, minutes),
      spells: aram ? [4, 32] : rng.pick(SPELLS_BY_ROLE[seat.role ?? "MIDDLE"]),
      keystone: rng.pick(build.keystones),
      secondaryStyle: rng.pick(build.secondary),
      largestMultiKill:
        k >= 12 && rng.chance(0.1) ? 5 : k >= 9 ? rng.pick([2, 3, 3, 4]) : k >= 5 ? rng.pick([1, 2, 2, 3]) : Math.min(k, rng.pick([1, 2])),
      placement: null,
    };
  });

  const objectivePace = minutes / 30;
  return {
    id: teamId,
    win,
    kills,
    gold: participants.reduce((sum, p) => sum + p.gold, 0),
    towers: aram ? (win ? 4 : rng.int(0, 2)) : win ? rng.int(7, 11) : rng.int(1, 6),
    dragons: aram ? 0 : Math.round((win ? rng.range(1.5, 3.6) : rng.range(0.3, 2.2)) * objectivePace),
    barons: aram ? 0 : minutes < 22 ? 0 : win ? rng.int(0, 2) : rng.int(0, 1),
    placement: null,
    participants,
  };
}

function buildMatch(me: Persona, index: number, anchor: number): MatchSummary {
  const rng = new Rng(`${me.seed}:match:${index}`);

  // Mostly solo queue, with some flex, normals and ARAM. A queue the player
  // has no rank in is swapped for normals, so history and rank cards agree.
  const rolled = [420, 420, 420, 420, 420, 420, 440, 400, 400, 450][rng.int(0, 9)];
  const queueId =
    (rolled === 420 && !me.playsSolo) || (rolled === 440 && !me.playsFlex) ? 400 : rolled;
  const aram = queueId === 450;
  const remake = !aram && rng.chance(0.03);
  const minutes = remake ? rng.range(3.1, 4.4) : aram ? rng.range(14, 24) : rng.range(19, 41);
  const win = rng.chance(me.skill);

  // Roughly four games a day, clustered in sessions.
  const endedAt = anchor - Math.floor(index / 4) * DAY_MS - (index % 4) * rng.range(45, 70) * 60_000 - rng.range(0, 30) * 60_000;

  const myRole: Position = rng.chance(0.78) ? me.mainRole : me.offRole;
  const myPool = me.pool.filter((c) => c.position === myRole);
  const myChamp = aram ? rng.pick(CHAMPION_POOL) : myPool[rng.weighted(myPool.map((_, i) => 1 / (i + 1)))];
  const mySide = rng.chance(0.5) ? 100 : 200;

  const used = new Set([myChamp.key]);
  const names = rng.shuffle(NAMES);
  const seatFor = (teamId: number, role: Position, n: number): Seat => {
    if (teamId === mySide && role === myRole) {
      return { champ: myChamp, role: aram ? null : role, gameName: me.gameName, tagLine: me.tagLine, puuid: me.puuid };
    }
    const options = (aram ? CHAMPION_POOL : championsFor(role)).filter((c) => !used.has(c.key));
    const champ = rng.pick(options);
    used.add(champ.key);
    const gameName = names[n];
    return {
      champ,
      role: aram ? null : role,
      gameName,
      tagLine: rng.chance(0.6) ? me.defaultTag : String(rng.int(1000, 9999)),
      puuid: `demo-${hashString(gameName).toString(16)}`,
    };
  };

  const killPace = aram ? 1.9 : 0.85;
  const winnerKills = remake ? rng.int(0, 2) : Math.round(minutes * killPace * rng.range(0.85, 1.3));
  const loserKills = remake ? rng.int(0, 2) : Math.round(minutes * killPace * rng.range(0.45, 0.9));

  const teams = [100, 200].map((teamId, t) => {
    const teamWin = (teamId === mySide) === win;
    const seats = POSITIONS.map((role, i) => seatFor(teamId, role, t * 5 + i));
    return buildTeam(
      rng,
      seats,
      teamId,
      teamWin,
      teamWin ? winnerKills : loserKills,
      teamWin ? loserKills : winnerKills,
      minutes,
      aram,
    );
  });

  return {
    id: `DEMO_${hashString(me.seed).toString(36)}_${index}`,
    queueId,
    gameMode: aram ? "ARAM" : "CLASSIC",
    endedAt: Math.round(endedAt),
    durationSec: Math.round(minutes * 60),
    remake,
    me: teams.flatMap((t) => t.participants).find((p) => p.puuid === me.puuid)!,
    teams,
  };
}

function matchPage(me: Persona, start: number, count: number, now: number): MatchPage {
  // Anchor to the start of the current UTC day so pages requested a few
  // minutes apart still line up.
  const anchor = Math.floor(now / DAY_MS) * DAY_MS - 20 * 60_000;
  const end = Math.min(TOTAL_MATCHES, start + count);
  const matches: MatchSummary[] = [];
  for (let i = Math.max(0, start); i < end; i++) matches.push(buildMatch(me, i, anchor));
  return {
    matches,
    hasMore: end < TOTAL_MATCHES,
    itemNames: collectItemNames(matches, (id) => ITEM_NAMES[id]),
  };
}

// --------------------------------------------------------------- profile

function rankedEntries(rng: Rng, me: Persona): RankedEntry[] {
  const { skill } = me;
  // Most players sit in the lower tiers; better win rates push upward.
  const weights = [6, 16, 22, 22, 14, 10, 6, 2, 1, 0.5];
  const shift = Math.round((skill - 0.5) * 20);
  const tierIndex = Math.max(0, Math.min(TIERS.length - 1, rng.weighted(weights) + shift));

  const entry = (queue: RankedEntry["queue"], index: number, games: number): RankedEntry => {
    const tier: Tier = TIERS[Math.max(0, Math.min(TIERS.length - 1, index))];
    const apex = index >= 7;
    const wins = Math.round(games * (skill + rng.range(-0.03, 0.03)));
    return {
      queue,
      tier,
      division: apex ? "I" : rng.pick(["I", "II", "III", "IV"]),
      lp: apex ? rng.int(0, 620) : rng.int(0, 99),
      wins,
      losses: games - wins,
      hotStreak: rng.chance(0.2),
    };
  };

  const entries: RankedEntry[] = [];
  if (me.playsSolo) entries.push(entry("RANKED_SOLO_5x5", tierIndex, rng.int(60, 340)));
  if (me.playsFlex) {
    entries.push(entry("RANKED_FLEX_SR", tierIndex - rng.int(0, 2), rng.int(12, 90)));
  }
  return entries;
}

function mastery(rng: Rng, me: Persona, now: number): MasteryEntry[] {
  let points = rng.int(180_000, 900_000);
  return me.pool.map((c, i) => {
    const entry: MasteryEntry = {
      championId: c.id,
      championKey: c.key,
      championName: c.name,
      level: Math.max(5, Math.round(points / 22_000)),
      points,
      lastPlayed: now - (i * 3 + rng.int(0, 2)) * DAY_MS,
    };
    points = Math.round(points * rng.range(0.4, 0.75));
    return entry;
  });
}

export function demoProfile(
  region: { slug: string; defaultTag: string },
  gameName: string,
  tagLine: string,
  matchCount: number,
  assetVersion: string,
  now: number,
): Profile {
  const me = persona(region.slug, gameName, tagLine, region.defaultTag);
  const rng = new Rng(`${me.seed}:profile`);
  const page = matchPage(me, 0, matchCount, now);

  return {
    source: "demo",
    regionSlug: region.slug,
    puuid: me.puuid,
    gameName,
    tagLine,
    requestSlug: riotIdToSlug({ gameName, tagLine }),
    profileIconId: rng.int(0, 28),
    level: rng.int(42, 780),
    ranked: rankedEntries(rng, me),
    mastery: mastery(rng, me, now),
    matches: page.matches,
    hasMoreMatches: page.hasMore,
    itemNames: page.itemNames,
    assetVersion,
    generatedAt: now,
  };
}

export function demoMatches(
  region: { slug: string; defaultTag: string },
  gameName: string,
  tagLine: string,
  start: number,
  count: number,
  now: number,
): MatchPage {
  return matchPage(persona(region.slug, gameName, tagLine, region.defaultTag), start, count, now);
}
