"use client";

import Link from "next/link";
import { useEffect, useId, useMemo } from "react";
import { getRegion } from "@/lib/regions";
import { profilePath } from "@/lib/riot-id";
import {
  clearRecent,
  parseRecent,
  rememberSearch,
  storeRegion,
  useRecentRaw,
  type RecentSearch,
} from "@/lib/storage";

export function PlayerChip({ region, gameName, tagLine }: RecentSearch) {
  const label = getRegion(region)?.label ?? region.toUpperCase();
  return (
    <Link
      href={profilePath(region, { gameName, tagLine })}
      className="inline-flex items-center gap-2 rounded-full border border-edge bg-panel py-1.5 pl-2 pr-3 text-sm transition-colors hover:border-faint"
    >
      <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[11px] text-soft">
        {label}
      </span>
      <span>
        {gameName}
        <span className="text-faint"> #{tagLine}</span>
      </span>
    </Link>
  );
}

export function RecentSearches() {
  const headingId = useId();
  const raw = useRecentRaw();
  const recent = useMemo(() => parseRecent(raw), [raw]);
  if (recent.length === 0) return null;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-3 flex items-center justify-between">
        <h2 id={headingId} className="label-caps">
          Recently viewed
        </h2>
        <button
          type="button"
          onClick={clearRecent}
          className="rounded text-xs text-faint hover:text-fg"
        >
          Clear
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {recent.map((r) => (
          <li key={`${r.region}:${r.gameName}#${r.tagLine}`}>
            <PlayerChip {...r} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Rendered on a profile page: records the visit, shows nothing. */
export function RememberProfile({ region, gameName, tagLine }: RecentSearch) {
  useEffect(() => {
    rememberSearch({ region, gameName, tagLine });
    storeRegion(region);
  }, [region, gameName, tagLine]);
  return null;
}
