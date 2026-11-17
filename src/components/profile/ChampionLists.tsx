"use client";

import { useDict } from "@/i18n/client";
import { championIcon } from "@/lib/assets";
import {
  formatCompact,
  formatNumber,
  initials,
  kdaRatio,
  percent,
  timeAgo,
} from "@/lib/format";
import type { ChampionStat } from "@/lib/stats";
import type { MasteryEntry } from "@/lib/types";
import { GameIcon } from "../GameIcon";
import { kdaTone } from "./SummaryPanel";

export function RecentChampions({
  champions,
  assetVersion,
}: {
  champions: ChampionStat[];
  assetVersion: string;
}) {
  const t = useDict();
  if (champions.length === 0) return null;
  return (
    <section className="card">
      <h2 className="label-caps px-4 pt-4">{t.champs.recent}</h2>
      <ul className="mt-2 divide-y divide-edge">
        {champions.slice(0, 7).map((c) => {
          const ratio = kdaRatio(c.kills, c.deaths, c.assists);
          const rate = percent(c.wins, c.games);
          const avg = (n: number) => (n / c.games).toFixed(1);
          return (
            <li key={c.championKey} className="flex items-center gap-3 px-4 py-2.5">
              <GameIcon
                src={championIcon(assetVersion, c.championKey)}
                alt=""
                label={initials(c.championName)}
                className="size-9 rounded-lg"
              />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-medium">{c.championName}</p>
                <p className="whitespace-nowrap font-mono text-xs text-faint" title={t.champs.csTitle}>
                  CS {c.csPerMin.toFixed(1)}
                </p>
              </div>
              <div className="text-center leading-tight">
                <p className={`text-sm font-semibold tabular-nums ${kdaTone(ratio)}`}>
                  {t.game.kda(ratio)}
                </p>
                <p className="font-mono text-[11px] text-faint">
                  {avg(c.kills)}/{avg(c.deaths)}/{avg(c.assists)}
                </p>
              </div>
              <div className="w-14 text-right leading-tight">
                <p className={`text-sm font-semibold tabular-nums ${rate >= 60 ? "text-win" : ""}`}>
                  {rate}%
                </p>
                <p className="font-mono text-[11px] text-faint">
                  {t.game.games(c.games)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function MasteryList({
  mastery,
  assetVersion,
  now,
}: {
  mastery: MasteryEntry[];
  assetVersion: string;
  now: number;
}) {
  const t = useDict();
  if (mastery.length === 0) return null;
  return (
    <section className="card">
      <h2 className="label-caps px-4 pt-4">{t.champs.mastery}</h2>
      <ul className="mt-2 divide-y divide-edge">
        {mastery.map((m) => (
          <li key={m.championId} className="flex items-center gap-3 px-4 py-2.5">
            <GameIcon
              src={championIcon(assetVersion, m.championKey)}
              alt=""
              label={initials(m.championName)}
              className="size-9 rounded-lg"
            />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium">{m.championName}</p>
              <p className="font-mono text-xs text-faint">
                {t.champs.lastPlayed(timeAgo(m.lastPlayed, now, t.time))}
              </p>
            </div>
            <div className="text-right leading-tight">
              <p
                className="text-sm font-semibold tabular-nums"
                title={t.champs.points(formatNumber(m.points))}
              >
                {formatCompact(m.points)}
              </p>
              <p className="font-mono text-[11px] text-faint">{t.champs.level(m.level)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
