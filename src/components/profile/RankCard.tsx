import { APEX_TIERS, RANKED_QUEUE_NAMES, tierName } from "@/lib/game-data";
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
  return (
    <section className="card p-4">
      <h2 className="label-caps mb-3">{RANKED_QUEUE_NAMES[queue]}</h2>
      {entry ? <Ranked entry={entry} /> : <Unranked />}
    </section>
  );
}

function Unranked() {
  return (
    <div className="flex items-center gap-4">
      <TierEmblem tier={null} />
      <p className="text-soft">Unranked</p>
    </div>
  );
}

function Ranked({ entry }: { entry: RankedEntry }) {
  const games = entry.wins + entry.losses;
  const winRate = percent(entry.wins, games);
  const division = APEX_TIERS.has(entry.tier) ? "" : ` ${entry.division}`;

  return (
    <>
      <div className="flex items-center gap-4">
        <TierEmblem tier={entry.tier} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-tight">
            {tierName(entry.tier)}
            {division}
          </p>
          <p className="font-mono text-sm text-soft">{entry.lp} LP</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold leading-tight tabular-nums">{winRate}%</p>
          <p className="font-mono text-xs text-faint">
            {entry.wins}W {entry.losses}L
          </p>
        </div>
      </div>
      <div
        className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-loss/70"
        role="img"
        aria-label={`${winRate}% win rate over ${games} games`}
      >
        <div className="bg-win" style={{ width: `${winRate}%` }} />
      </div>
      {entry.hotStreak && (
        <p className="mt-3 text-xs text-gold">On a winning streak</p>
      )}
    </>
  );
}
