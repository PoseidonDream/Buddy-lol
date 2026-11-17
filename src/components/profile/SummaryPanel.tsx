"use client";

import { useDict } from "@/i18n/client";
import { kdaRatio, percent } from "@/lib/format";
import type { Outcome, Summary } from "@/lib/stats";

export function kdaTone(ratio: number | null): string {
  if (ratio === null || ratio >= 5) return "text-gold";
  if (ratio >= 3) return "text-win";
  return "text-fg";
}

function WinRing({ wins, games }: { wins: number; games: number }) {
  const t = useDict();
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
        <span className="font-mono text-[10px] uppercase text-faint">{t.summary.ringLabel}</span>
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

const FORM_TILE: Record<Outcome, string> = { win: "bg-win", loss: "bg-loss", remake: "bg-faint/60" };

/** One small tile per game, most recent first. */
function FormStrip({ form }: { form: Outcome[] }) {
  const t = useDict();
  return (
    <ol className="mt-2 flex max-w-44 flex-wrap gap-1" aria-label={t.summary.form}>
      {form.map((outcome, i) => (
        <li key={i} title={t.summary.outcome[outcome]} className={`size-2.5 rounded-[3px] ${FORM_TILE[outcome]}`}>
          <span className="sr-only">{t.summary.outcome[outcome]}</span>
        </li>
      ))}
    </ol>
  );
}

export function SummaryPanel({
  summary,
  form,
  loading = false,
}: {
  summary: Summary;
  form: Outcome[];
  /** More games for this view are on their way. */
  loading?: boolean;
}) {
  const t = useDict();
  const { games, wins, losses } = summary;
  if (games === 0) {
    return (
      <section className="card p-6 text-center text-soft">
        {loading ? t.summary.loading : t.summary.none}
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
            <p className="label-caps">{t.summary.lastGames(games)}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              <span className="text-win">{t.summary.wins(wins)}</span>{" "}
              <span className="text-loss">{t.summary.losses(losses)}</span>
            </p>
            <FormStrip form={form} />
          </div>
        </div>

        <dl className="grid w-full grid-cols-2 gap-x-8 gap-y-4 whitespace-nowrap sm:flex sm:w-auto sm:flex-1 sm:justify-between">
          <Stat label="KDA" value={t.game.kda(ratio)} tone={kdaTone(ratio)} />
          <Stat
            label="K / D / A"
            value={`${per(summary.kills)} / ${per(summary.deaths)} / ${per(summary.assists)}`}
          />
          <Stat label={t.summary.killParticipation} value={`${summary.killParticipation}%`} />
          <Stat label={t.summary.csPerMin} value={summary.csPerMin.toFixed(1)} />
        </dl>
      </div>

      {playedRoles && (
        <ul className="mt-5 grid grid-cols-5 gap-3 border-t border-edge pt-4">
          {summary.roles.map((role) => (
            <li key={role.position}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="label-caps">
                  <span className="sm:hidden">{t.game.position(role.position).slice(0, 3)}</span>
                  <span className="max-sm:hidden">{t.game.position(role.position)}</span>
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
