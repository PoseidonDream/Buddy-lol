"use client";

import { useState } from "react";
import { riotIdToSlug } from "@/lib/riot-id";
import type { ItemNames, MatchSummary, MatchTimeline, Result } from "@/lib/types";
import { BuildOrder } from "./BuildOrder";
import { GoldChart } from "./GoldChart";
import { MatchDetails } from "./MatchDetails";

type Tab = "scoreboard" | "gold" | "build";

type Load =
  | { status: "idle" | "loading" }
  | { status: "ready"; timeline: MatchTimeline }
  | { status: "error"; message: string };

/** An opened match: the scoreboard, and from the timeline the gold graph and builds. */
export function MatchExpanded({
  match,
  regionSlug,
  assetVersion,
  itemNames,
}: {
  match: MatchSummary;
  regionSlug: string;
  assetVersion: string;
  itemNames: ItemNames;
}) {
  const [tab, setTab] = useState<Tab>("scoreboard");
  const [load, setLoad] = useState<Load>({ status: "idle" });

  // Remakes have nothing worth a timeline; Arena has no two sides to compare gold.
  const tabs: { id: Tab; label: string }[] = match.remake
    ? []
    : [
        { id: "scoreboard", label: "Scoreboard" },
        ...(match.teams.length === 2 ? [{ id: "gold" as const, label: "Gold" }] : []),
        { id: "build", label: "Build" },
      ];

  async function fetchTimeline() {
    if (load.status === "loading" || load.status === "ready") return;
    setLoad({ status: "loading" });
    try {
      const player = riotIdToSlug(match.me);
      const res = await fetch(
        `/api/match/${regionSlug}/${encodeURIComponent(match.id)}/timeline?player=${encodeURIComponent(player)}`,
      );
      const body = (await res.json()) as Result<MatchTimeline>;
      setLoad(body.ok ? { status: "ready", timeline: body.data } : { status: "error", message: body.error.message });
    } catch {
      setLoad({ status: "error", message: "Couldn't load the timeline. Check your connection and try again." });
    }
  }

  function choose(next: Tab) {
    setTab(next);
    if (next !== "scoreboard") void fetchTimeline();
  }

  let panel: React.ReactNode;
  if (tab === "scoreboard") {
    panel = <MatchDetails match={match} regionSlug={regionSlug} assetVersion={assetVersion} itemNames={itemNames} />;
  } else if (load.status === "ready") {
    panel =
      tab === "gold" ? (
        <GoldChart match={match} timeline={load.timeline} />
      ) : (
        <BuildOrder match={match} timeline={load.timeline} assetVersion={assetVersion} />
      );
  } else if (load.status === "error") {
    panel = (
      <div className="flex flex-wrap items-center gap-3 p-4 text-sm">
        <p role="alert" className="text-loss">
          {load.message}
        </p>
        <button type="button" onClick={() => void fetchTimeline()} className="rounded text-accent hover:underline">
          Try again
        </button>
      </div>
    );
  } else {
    panel = <div className="m-4 h-40 animate-pulse rounded-lg bg-raised" aria-label="Loading the timeline" />;
  }

  return (
    <>
      {tabs.length > 0 && (
        <div role="tablist" aria-label="Match details" className="flex gap-1 border-b border-edge px-3 pt-2 sm:px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => choose(t.id)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id ? "border-accent text-fg" : "border-transparent text-soft hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div role={tabs.length > 0 ? "tabpanel" : undefined}>{panel}</div>
    </>
  );
}
