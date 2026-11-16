/** Aggregates over a list of matches. Pure, so filters can re-run it in the browser. */

import { POSITIONS } from "./game-data";
import type { MatchSummary, Position } from "./types";

export interface ChampionStat {
  championKey: string;
  championName: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  csPerMin: number;
}

export interface RoleStat {
  position: Position;
  games: number;
  wins: number;
}

export interface Summary {
  /** Games that count: remakes are excluded from everything below. */
  games: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
  /** Share of the team's kills the player was part of, 0-100. */
  killParticipation: number;
  csPerMin: number;
  champions: ChampionStat[];
  roles: RoleStat[];
}

export function summarize(matches: MatchSummary[]): Summary {
  const counted = matches.filter((m) => !m.remake);
  const champions = new Map<string, ChampionStat & { minutes: number; cs: number }>();
  const roles = new Map<Position, RoleStat>();

  let wins = 0;
  let kills = 0;
  let deaths = 0;
  let assists = 0;
  let teamKills = 0;
  let cs = 0;
  let minutes = 0;

  for (const m of counted) {
    const { me } = m;
    const mins = m.durationSec / 60;
    if (me.win) wins++;
    kills += me.kills;
    deaths += me.deaths;
    assists += me.assists;
    cs += me.cs;
    minutes += mins;
    teamKills += m.teams.find((t) => t.id === me.teamId)?.kills ?? 0;

    let c = champions.get(me.championKey);
    if (!c) {
      c = {
        championKey: me.championKey,
        championName: me.championName,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        csPerMin: 0,
        minutes: 0,
        cs: 0,
      };
      champions.set(me.championKey, c);
    }
    c.games++;
    if (me.win) c.wins++;
    c.kills += me.kills;
    c.deaths += me.deaths;
    c.assists += me.assists;
    c.cs += me.cs;
    c.minutes += mins;

    if (me.position) {
      const r = roles.get(me.position) ?? { position: me.position, games: 0, wins: 0 };
      r.games++;
      if (me.win) r.wins++;
      roles.set(me.position, r);
    }
  }

  return {
    games: counted.length,
    wins,
    losses: counted.length - wins,
    kills,
    deaths,
    assists,
    killParticipation: teamKills === 0 ? 0 : Math.round(((kills + assists) / teamKills) * 100),
    csPerMin: minutes === 0 ? 0 : cs / minutes,
    champions: [...champions.values()]
      .map(({ minutes: mins, cs: total, ...c }) => ({
        ...c,
        csPerMin: mins === 0 ? 0 : total / mins,
      }))
      .sort((a, b) => b.games - a.games || b.wins - a.wins),
    roles: POSITIONS.map((p) => roles.get(p) ?? { position: p, games: 0, wins: 0 }),
  };
}
