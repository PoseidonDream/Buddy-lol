"use client";

import { useId, useMemo, useRef, useState } from "react";
import { formatCompact } from "@/lib/format";
import type { MatchSummary, MatchTimeline, ObjectiveKind } from "@/lib/types";

const W = 640;
const H = 210;
const PAD = { left: 44, right: 12, top: 22, bottom: 24 };
const STEPS = [500, 1000, 2000, 2500, 5000, 10_000, 20_000];

const MARKS: Partial<Record<ObjectiveKind, { label: string; path: (x: number, y: number) => string }>> = {
  dragon: { label: "Dragon", path: (x, y) => `M${x - 4},${y}a4,4 0 1,0 8,0a4,4 0 1,0 -8,0` },
  baron: { label: "Baron", path: (x, y) => `M${x},${y - 5}L${x + 5},${y}L${x},${y + 5}L${x - 5},${y}Z` },
  herald: { label: "Herald", path: (x, y) => `M${x},${y - 5}L${x + 5},${y + 4}L${x - 5},${y + 4}Z` },
  grubs: { label: "Void grubs", path: (x, y) => `M${x},${y - 5}L${x + 5},${y + 4}L${x - 5},${y + 4}Z` },
  atakhan: { label: "Atakhan", path: (x, y) => `M${x},${y - 5}L${x + 5},${y + 4}L${x - 5},${y + 4}Z` },
};

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${formatCompact(Math.abs(n))}`;

/** The gold lead of the player's team over the enemy team, minute by minute. */
export function GoldChart({ match, timeline }: { match: MatchSummary; timeline: MatchTimeline }) {
  const uid = useId();
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { lead, mine, theirs } = useMemo(() => {
    const myTeam = match.me.teamId;
    const teamOf = new Map(match.teams.flatMap((t) => t.participants.map((p) => [p.puuid, t.id] as const)));
    const length = Math.min(...timeline.players.map((p) => p.gold.length));
    const mine: number[] = [];
    const theirs: number[] = [];
    for (let m = 0; m < length; m++) {
      let a = 0;
      let b = 0;
      for (const p of timeline.players) {
        if (teamOf.get(p.puuid) === myTeam) a += p.gold[m];
        else b += p.gold[m];
      }
      mine.push(a);
      theirs.push(b);
    }
    return { lead: mine.map((a, i) => a - theirs[i]), mine, theirs };
  }, [match, timeline]);

  if (lead.length < 2) return <p className="p-4 text-sm text-soft">This game was too short for a gold graph.</p>;

  const peak = Math.max(1, ...lead.map(Math.abs));
  const step = STEPS.find((s) => peak / s <= 3) ?? 50_000;
  const top = Math.ceil(peak / step) * step;
  const x = (minute: number) => PAD.left + ((W - PAD.left - PAD.right) * minute) / (lead.length - 1);
  const y = (value: number) => PAD.top + ((H - PAD.top - PAD.bottom) * (top - value)) / (2 * top);
  const zero = y(0);

  const line = lead.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line}L${x(lead.length - 1)},${zero}L${x(0)},${zero}Z`;
  const ticks = Array.from({ length: Math.floor(top / step) * 2 + 1 }, (_, i) => top - i * step);
  const every = lead.length > 36 ? 10 : 5;
  const minuteTicks = Array.from({ length: Math.floor((lead.length - 1) / every) + 1 }, (_, i) => i * every);

  const best = lead.reduce((b, v, i) => (v > lead[b] ? i : b), 0);
  const worst = lead.reduce((b, v, i) => (v < lead[b] ? i : b), 0);
  const marks = timeline.objectives.filter((o) => MARKS[o.kind]);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    const minute = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (lead.length - 1));
    setHover(Math.max(0, Math.min(lead.length - 1, minute)));
  }

  return (
    <figure className="p-3 sm:p-4">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-medium">Gold lead of {match.me.gameName}&apos;s team</span>
        <span className="text-xs text-faint">
          Biggest lead <span className="font-mono text-fg">{signed(lead[best])}</span> at {best} min · biggest deficit{" "}
          <span className="font-mono text-fg">{signed(lead[worst])}</span> at {worst} min
        </span>
      </figcaption>

      <div className="relative">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-pan-y select-none"
          role="img"
          aria-labelledby={`${uid}-desc`}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <desc id={`${uid}-desc`}>
            Gold lead by minute. Above the middle line the team was ahead, below it behind. Ends at{" "}
            {signed(lead.at(-1)!)}.
          </desc>
          <defs>
            <clipPath id={`${uid}-above`}>
              <rect x={0} y={0} width={W} height={zero} />
            </clipPath>
            <clipPath id={`${uid}-below`}>
              <rect x={0} y={zero} width={W} height={H - zero} />
            </clipPath>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className={t === 0 ? "stroke-faint" : "stroke-edge"}
                strokeDasharray={t === 0 ? undefined : "3 4"}
                strokeWidth={1}
              />
              <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-faint font-mono text-[10px]">
                {t === 0 ? "0" : signed(t)}
              </text>
            </g>
          ))}
          {minuteTicks.map((m) => (
            <text key={m} x={x(m)} y={H - 6} textAnchor="middle" className="fill-faint font-mono text-[10px]">
              {m}m
            </text>
          ))}

          <path d={area} clipPath={`url(#${uid}-above)`} className="fill-win/25" />
          <path d={area} clipPath={`url(#${uid}-below)`} className="fill-loss/25" />
          <path d={line} clipPath={`url(#${uid}-above)`} className="fill-none stroke-win" strokeWidth={2} strokeLinejoin="round" />
          <path d={line} clipPath={`url(#${uid}-below)`} className="fill-none stroke-loss" strokeWidth={2} strokeLinejoin="round" />

          {/* Monsters: the player's team along the top, the enemy's along the bottom. */}
          {marks.map((o, i) => {
            const mx = x(Math.min(lead.length - 1, o.at / 60));
            const my = o.teamId === match.me.teamId ? PAD.top - 12 : H - PAD.bottom - 6;
            return (
              <path
                key={i}
                d={MARKS[o.kind]!.path(mx, my)}
                className={`${o.teamId === match.me.teamId ? "fill-win" : "fill-loss"} stroke-panel`}
                strokeWidth={1.5}
              >
                <title>
                  {MARKS[o.kind]!.label} · {o.teamId === match.me.teamId ? "your team" : "enemy team"} ·{" "}
                  {Math.floor(o.at / 60)}:{String(o.at % 60).padStart(2, "0")}
                </title>
              </path>
            );
          })}

          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} className="stroke-soft" strokeWidth={1} />
              <circle
                cx={x(hover)}
                cy={y(lead[hover])}
                r={4.5}
                className={`${lead[hover] >= 0 ? "fill-win" : "fill-loss"} stroke-panel`}
                strokeWidth={2}
              />
            </g>
          )}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-max -translate-x-1/2 rounded-lg border border-edge bg-raised px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${Math.min(85, Math.max(15, (x(hover) / W) * 100))}%` }}
          >
            <p className="font-medium">
              {hover} min ·{" "}
              <span className="font-mono">{signed(lead[hover])}</span>
            </p>
            <p className="font-mono text-faint">
              {formatCompact(mine[hover])} vs {formatCompact(theirs[hover])}
            </p>
          </div>
        )}
      </div>

      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-faint">
        <span>Top row: your team&apos;s objectives · bottom row: the enemy&apos;s</span>
        <span>● dragon ◆ baron ▲ herald, grubs or Atakhan</span>
      </p>

      <table className="sr-only">
        <caption>Gold lead by minute</caption>
        <thead>
          <tr>
            <th scope="col">Minute</th>
            <th scope="col">Lead</th>
          </tr>
        </thead>
        <tbody>
          {lead.map((v, m) => (
            <tr key={m}>
              <td>{m}</td>
              <td>{signed(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
