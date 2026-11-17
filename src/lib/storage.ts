"use client";

/**
 * A thin layer over localStorage that React can subscribe to. Reads and
 * writes are wrapped because storage throws in some private-browsing modes.
 */

import { useSyncExternalStore } from "react";
import type { RiotId } from "./riot-id";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage is unavailable: the preference just won't persist.
  }
  listeners.forEach((l) => l());
}

/** `null` on the server and until something has been stored. */
function useStored(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
}

const REGION_KEY = "buddy:region";
const RECENT_KEY = "buddy:recent";
const MAX_RECENT = 8;

export interface RecentSearch extends RiotId {
  region: string;
}

export function useStoredRegion(): string | null {
  return useStored(REGION_KEY);
}

export function storeRegion(slug: string) {
  write(REGION_KEY, slug);
}

function parseRecent(raw: string | null): RecentSearch[] {
  if (!raw) return [];
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (x): x is RecentSearch =>
        typeof x?.region === "string" &&
        typeof x?.gameName === "string" &&
        typeof x?.tagLine === "string",
    );
  } catch {
    return [];
  }
}

/** The raw stored string: parse it with `parseRecent` inside a `useMemo`. */
export function useRecentRaw(): string | null {
  return useStored(RECENT_KEY);
}

export { parseRecent };

export function rememberSearch(entry: RecentSearch) {
  const same = (a: RecentSearch) =>
    a.region === entry.region &&
    a.gameName.toLowerCase() === entry.gameName.toLowerCase() &&
    a.tagLine.toLowerCase() === entry.tagLine.toLowerCase();
  const rest = parseRecent(read(RECENT_KEY)).filter((a) => !same(a));
  write(RECENT_KEY, JSON.stringify([entry, ...rest].slice(0, MAX_RECENT)));
}

export function clearRecent() {
  write(RECENT_KEY, null);
}
