"use client";

import { useSyncExternalStore } from "react";

const STEP = 30_000;

function subscribe(listener: () => void) {
  const timer = window.setInterval(listener, STEP);
  return () => window.clearInterval(timer);
}

/**
 * The current time, coarse enough to be stable between renders, re-rendering
 * every 30 seconds. While hydrating it returns `initial` (the server's clock),
 * so relative times match the server-rendered HTML.
 */
export function useNow(initial: number): number {
  return useSyncExternalStore(
    subscribe,
    () => Math.max(initial, Math.floor(Date.now() / STEP) * STEP),
    () => initial,
  );
}
