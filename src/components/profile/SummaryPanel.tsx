import { formatKda, kdaRatio, percent } from "@/lib/format";
import { POSITION_NAMES } from "@/lib/game-data";
import type { Summary } from "@/lib/stats";

export function kdaTone(ratio: number | null): string {
  if (ratio === null || ratio >= 5) return "text-gold";
  if (ratio >= 3) return "text-win";
  return "text-fg";
}

function WinRing({ wins, games }: { wins: number; games: number }) {
  const rate = percent(wins, games);
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-loss/70" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeDasharray={`${(rate / 100) * c} ${c}`}
          className="stroke-win"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular-nums">{rate}%</span>
        <span className="font-mono text-[10px] text-faint">WIN RATE</span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="label-caps">{label}</dt>
      <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}

export function SummaryPanel({ summary }: { summary: Summary }) {
  const { games, wins, losses } = summary;
  if (games === 0) {
    return (
      <section className="card p-6 text-center text-soft">
        No games in this queue among the matches loaded so far.
      </section>
    );
  }

  const per = (n: number) => (n / games).toFixed(1);
  const ratio = kdaRatio(summary.kills, summary.deaths, summary.assists);
  const busiest = Math.max(1, ...summary.roles.map((r) => r.games));
  const playedRoles = summary.roles.some((r) => r.games > 0);

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
        <div className="flex items-center gap-4">
          <WinRing wins={wins} games={games} />
          <div>
            <p className="label-caps">{games === 1 ? "Last game" : `Last ${games} games`}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              <span className="text-win">{wins}W</span>{" "}
              <span className="text-loss">{losses}L</span>
            </p>
          </div>
        </div>

        <dl className="grid w-full grid-cols-2 gap-x-8 gap-y-4 whitespace-nowrap sm:flex sm:w-auto sm:flex-1 sm:justify-between">
          <Stat label="KDA" value={formatKda(ratio)} tone={kdaTone(ratio)} />
          <Stat
            label="K / D / A"
            value={`${per(summary.kills)} / ${per(summary.deaths)} / ${per(summary.assists)}`}
          />
          <Stat label="Kill part." value={`${summary.killParticipation}%`} />
          <Stat label="CS / min" value={summary.csPerMin.toFixed(1)} />
        </dl>
      </div>

      {playedRoles && (
        <ul className="mt-5 grid grid-cols-5 gap-3 border-t border-edge pt-4">
          {summary.roles.map((role) => (
            <li key={role.position}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="label-caps">
                  <span className="sm:hidden">{POSITION_NAMES[role.position].slice(0, 3)}</span>
                  <span className="max-sm:hidden">{POSITION_NAMES[role.position]}</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-soft">{role.games}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(role.games / busiest) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
