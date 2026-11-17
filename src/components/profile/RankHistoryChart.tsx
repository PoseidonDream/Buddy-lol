"use client";

import { useId, useMemo, useState } from "react";
import { useDict, useLocale } from "@/i18n/client";
import type { Dict } from "@/i18n/dictionaries";
import { INTL_LOCALE } from "@/i18n/config";
import { APEX_FLOOR, bandName } from "@/lib/rank-scale";
import type { RankHistory } from "@/lib/types";

// Drawing space; the SVG scales to its container.
const W = 300;
const H = 168;
const PAD = { top: 12, right: 14, bottom: 22, left: 10 };



/** Gridlines: tier boundaries for a wide range, division boundaries for a narrow one. */
function gridlines(min: number, max: number, t: Dict): { value: number; label: string }[] {
  const divisions = max - min < 400;
  const step = divisions ? 100 : 400;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= Math.min(max, APEX_FLOOR); v += step) {
    out.push({ value: v, label: bandName(v, divisions && v < APEX_FLOOR, t.game.tier) });
  }
  return out;
}

export function RankHistoryChart({ history }: { history: RankHistory }) {
  const { points, source, queue } = history;
  const t = useDict();
  const locale = useLocale();
  const { dateFormat, fullDate } = useMemo(
    () => ({
      dateFormat: new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: "short", day: "numeric" }),
      fullDate: new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: "short", day: "numeric", year: "numeric" }),
    }),
    [locale],
  );
  const uid = useId();
  const [active, setActive] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const values = points.map((p) => p.value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    // Some headroom, and never less than one division of vertical range.
    const span = Math.max(100, hi - lo);
    const min = Math.max(0, lo - span * 0.15);
    const max = hi + span * 0.15;
    const t0 = points[0].at;
    const t1 = points.at(-1)!.at;
    const x = (at: number) =>
      PAD.left + (t1 === t0 ? 1 : (at - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom);
    const coords = points.map((p) => ({ x: x(p.at), y: y(p.value) }));
    const line = coords.map((c, i) => `${i ? "L" : "M"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join("");
    const base = H - PAD.bottom;
    const area = `${line}L${coords.at(-1)!.x.toFixed(1)},${base}L${coords[0].x.toFixed(1)},${base}Z`;
    return { coords, line, area, y, grid: gridlines(min, max, t) };
  }, [points, t]);

  if (points.length < 2) {
    return (
      <section className="card p-4">
        <h2 className="label-caps">{t.lp.heading}</h2>
        <p className="mt-2 text-sm text-soft">{t.lp.startsToday}</p>
      </section>
    );
  }

  const first = points[0];
  const last = points.at(-1)!;
  const change = last.value - first.value;
  const shown = active === null ? null : points[active];
  const activeCoord = active === null ? null : geometry.coords[active];

  function nearest(clientX: number, rect: DOMRect) {
    const svgX = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    geometry.coords.forEach((c, i) => {
      if (Math.abs(c.x - svgX) < Math.abs(geometry.coords[best].x - svgX)) best = i;
    });
    return best;
  }

  return (
    <section className="card p-4" aria-labelledby={`${uid}-title`}>
      <h2 id={`${uid}-title`} className="label-caps">
        {t.lp.heading}
      </h2>
      <p className="mt-1 text-xs text-soft">
        {queue === "RANKED_SOLO_5x5" ? t.lp.solo : t.lp.flex} ·{" "}
        <span className="font-semibold tabular-nums text-fg">
          {change >= 0 ? "+" : "−"}
          {Math.abs(change)} LP
        </span>{" "}
        {t.lp.since(dateFormat.format(first.at))}
      </p>

      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full touch-none select-none outline-none"
          role="img"
          aria-label={t.lp.chartLabel(first.label, fullDate.format(first.at), last.label)}
          tabIndex={0}
          onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((a) => a ?? points.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const step = e.key === "ArrowLeft" ? -1 : 1;
            setActive((a) => Math.min(points.length - 1, Math.max(0, (a ?? points.length - 1) + step)));
          }}
        >
          {geometry.grid.map((g) => (
            <g key={g.value}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={geometry.y(g.value)}
                y2={geometry.y(g.value)}
                className="stroke-edge"
                strokeWidth="1"
              />
              {/* A halo in the panel colour keeps the label legible where the line crosses it. */}
              <text
                x={PAD.left + 2}
                y={geometry.y(g.value) - 4}
                className="fill-faint stroke-panel font-mono"
                fontSize="9"
                strokeWidth="3"
                paintOrder="stroke"
                strokeLinejoin="round"
              >
                {g.label}
              </text>
            </g>
          ))}

          <path d={geometry.area} className="fill-chart" opacity="0.1" />
          <path
            d={geometry.line}
            fill="none"
            className="stroke-chart"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Today's rank: end dot with a ring in the surface colour. */}
          <circle
            cx={geometry.coords.at(-1)!.x}
            cy={geometry.coords.at(-1)!.y}
            r="4"
            className="fill-chart stroke-panel"
            strokeWidth="2"
          />

          {activeCoord && (
            <g pointerEvents="none">
              <line
                x1={activeCoord.x}
                x2={activeCoord.x}
                y1={PAD.top}
                y2={H - PAD.bottom}
                className="stroke-faint"
                strokeWidth="1"
              />
              <circle cx={activeCoord.x} cy={activeCoord.y} r="4.5" className="fill-chart stroke-panel" strokeWidth="2" />
            </g>
          )}

          <text x={PAD.left} y={H - 6} className="fill-faint font-mono" fontSize="9">
            {dateFormat.format(first.at)}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-faint font-mono" fontSize="9">
            {t.lp.today}
          </text>
        </svg>

        {shown && activeCoord && (
          <div
            className="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-lg border border-edge bg-ink/95 px-2.5 py-1.5 shadow-lg"
            style={{
              left: `${(activeCoord.x / W) * 100}%`,
              transform: `translateX(${activeCoord.x > W * 0.6 ? "-105%" : "5%"})`,
            }}
            role="status"
          >
            <p className="text-sm font-semibold tabular-nums">{shown.label}</p>
            <p className="font-mono text-[11px] text-faint">{fullDate.format(shown.at)}</p>
          </div>
        )}
      </div>

      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-faint hover:text-fg">{t.lp.table}</summary>
        <table className="mt-2 w-full font-mono">
          <thead>
            <tr className="text-faint">
              <th scope="col" className="py-1 text-left font-normal">{t.lp.date}</th>
              <th scope="col" className="py-1 text-right font-normal">{t.live.rank}</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p, i) => (
              <tr key={i} className="border-t border-edge">
                <td className="py-1">{fullDate.format(p.at)}</td>
                <td className="py-1 text-right tabular-nums">{p.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      {source === "live" && (
        <p className="mt-2 text-[11px] text-faint">
          {t.lp.recorded}
        </p>
      )}
    </section>
  );
}
