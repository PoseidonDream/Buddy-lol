"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { championIcon } from "@/lib/assets";
import { initials } from "@/lib/format";
import { POSITION_NAMES } from "@/lib/game-data";
import type { Position } from "@/lib/types";
import { GameIcon } from "../GameIcon";

export type Tier = "S" | "A" | "B" | "C" | "D";

export interface TierTableRow {
  championKey: string;
  championName: string;
  position: Position;
  positionSlug: string;
  games: number;
  winRate: number;
  pickRate: number;
  banRate: number;
  tier: Tier | null;
}

type SortKey = "tier" | "championName" | "winRate" | "pickRate" | "banRate" | "games";

const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, none: 5 };

const TIER_STYLE: Record<Tier, string> = {
  S: "bg-gold/20 text-gold",
  A: "bg-accent/20 text-accent",
  B: "bg-win/15 text-win",
  C: "bg-white/5 text-soft",
  D: "bg-loss/15 text-loss",
};

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function TierTable({
  rows,
  assetVersion,
  patch,
}: {
  rows: TierTableRow[];
  assetVersion: string;
  patch: string;
}) {
  const uid = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "tier", desc: false });

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? rows.filter((r) => r.championName.toLowerCase().includes(q)) : [...rows];
    const dir = sort.desc ? -1 : 1;
    return list.sort((a, b) => {
      if (sort.key === "tier") {
        const t = TIER_ORDER[a.tier ?? "none"] - TIER_ORDER[b.tier ?? "none"];
        return dir * t || b.winRate - a.winRate;
      }
      if (sort.key === "championName") return dir * a.championName.localeCompare(b.championName);
      return dir * (a[sort.key] - b[sort.key]);
    });
  }, [rows, query, sort]);

  function header(key: SortKey, label: string, className = "") {
    const active = sort.key === key;
    return (
      <th
        scope="col"
        className={`py-2 font-normal ${className}`}
        aria-sort={active ? (sort.desc ? "descending" : "ascending") : undefined}
      >
        <button
          type="button"
          onClick={() =>
            setSort((s) =>
              s.key === key
                ? { key, desc: !s.desc }
                : // Numbers read best largest first; names and tiers from the top.
                  { key, desc: key !== "championName" && key !== "tier" },
            )
          }
          className={`label-caps rounded hover:text-fg ${active ? "text-fg" : ""}`}
        >
          {label}
          {active && <span aria-hidden="true">{sort.desc ? " ↓" : " ↑"}</span>}
        </button>
      </th>
    );
  }

  return (
    <div>
      <label htmlFor={`${uid}-filter`} className="sr-only">
        Find a champion
      </label>
      <input
        id={`${uid}-filter`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find a champion"
        autoComplete="off"
        className="mb-3 h-10 w-full rounded-lg border border-edge bg-panel px-3 text-sm outline-none placeholder:text-faint focus:border-accent sm:w-72"
      />

      <div className="card overflow-hidden">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-edge">
            <tr>
              {header("tier", "Tier", "w-20 pl-4")}
              {header("championName", "Champion")}
              <th scope="col" className="label-caps w-24 py-2 font-normal max-sm:hidden">
                Role
              </th>
              {header("winRate", "Win", "w-16 text-right sm:w-24")}
              {header("pickRate", "Pick", "w-16 text-right sm:w-24 max-[420px]:hidden")}
              {header("banRate", "Ban", "w-24 text-right max-md:hidden")}
              {header("games", "Games", "w-24 pr-4 text-right max-md:hidden")}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {shown.map((r) => (
              <tr key={`${r.championKey}-${r.position}`} className="hover:bg-white/[0.03]">
                <td className="py-2 pl-4">
                  {r.tier ? (
                    <span className={`inline-block w-7 rounded-md py-0.5 text-center text-xs font-bold ${TIER_STYLE[r.tier]}`}>
                      {r.tier}
                    </span>
                  ) : (
                    <span className="text-xs text-faint" title="Not enough games yet">
                      –
                    </span>
                  )}
                </td>
                <td className="truncate py-2 pr-2">
                  <Link
                    href={`/champions/${r.championKey}?position=${r.positionSlug}&patch=${patch}`}
                    className="inline-flex max-w-full items-center gap-2.5 rounded-md font-medium hover:underline"
                  >
                    <GameIcon
                      src={championIcon(assetVersion, r.championKey)}
                      alt=""
                      label={initials(r.championName)}
                      className="size-8 shrink-0 rounded-lg"
                    />
                    <span className="truncate">{r.championName}</span>
                  </Link>
                </td>
                <td className="py-2 text-soft max-sm:hidden">{POSITION_NAMES[r.position]}</td>
                <td className="py-2 text-right font-mono tabular-nums">{pct(r.winRate)}</td>
                <td className="py-2 text-right font-mono tabular-nums text-soft max-[420px]:hidden">
                  {pct(r.pickRate)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-soft max-md:hidden">
                  {pct(r.banRate)}
                </td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums text-faint max-md:hidden">
                  {r.games.toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="p-6 text-center text-sm text-soft">No champion matches “{query}”.</p>
        )}
      </div>
    </div>
  );
}
