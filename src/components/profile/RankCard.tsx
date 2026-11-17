"use client";

import { useDict } from "@/i18n/client";
import { APEX_TIERS } from "@/lib/game-data";
import { percent } from "@/lib/format";
import type { RankedEntry, RankedQueue } from "@/lib/types";
import { TierEmblem } from "../TierEmblem";

export function RankCard({
  queue,
  entry,
}: {
  queue: RankedQueue;
  entry: RankedEntry | undefined;
}) {
  const t = useDict();
  return (
    <section className="card p-4">
      <h2 className="label-caps mb-3">{t.game.rankedQueue(queue)}</h2>
      {entry ? <Ranked entry={entry} /> : <Unranked />}
    </section>
  );
}

function Unranked() {
  const t = useDict();
  return (
    <div className="flex items-center gap-4">
      <TierEmblem tier={null} />
      <p className="text-soft">{t.rank.unranked}</p>
    </div>
  );
}

function Ranked({ entry }: { entry: RankedEntry }) {
  const t = useDict();
  const games = entry.wins + entry.losses;
  const winRate = percent(entry.wins, games);
  const division = APEX_TIERS.has(entry.tier) ? "" : ` ${entry.division}`;

  return (
    <>
      <div className="flex items-center gap-4">
        <TierEmblem tier={entry.tier} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-tight">
            {t.game.tier(entry.tier)}
            {division}
          </p>
          <p className="font-mono text-sm text-soft">{entry.lp} LP</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold leading-tight tabular-nums">{winRate}%</p>
          <p className="font-mono text-xs text-faint">
            {t.game.record(entry.wins, entry.losses)}
          </p>
        </div>
      </div>
      <div
        className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-loss/70"
        role="img"
        aria-label={t.rank.winRateLabel(winRate, games)}
      >
        <div className="bg-win" style={{ width: `${winRate}%` }} />
      </div>
      {entry.hotStreak && (
        <p className="mt-3 text-xs text-gold">{t.rank.hotStreak}</p>
      )}
    </>
  );
}
