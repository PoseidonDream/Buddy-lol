"use client";

import { useId, useMemo, useState } from "react";
import { QUEUE_FILTERS, queueGroup, type QueueGroup } from "@/lib/game-data";
import { summarize } from "@/lib/stats";
import type { MatchPage, MatchSummary, Profile, RankedQueue, Result } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { RememberProfile } from "../RecentSearches";
import { MasteryList, RecentChampions } from "./ChampionLists";
import { MatchCard } from "./MatchCard";
import { ProfileHeader } from "./ProfileHeader";
import { RankCard } from "./RankCard";
import { SummaryPanel } from "./SummaryPanel";

const RANKED: RankedQueue[] = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"];

type Filter = "all" | QueueGroup;

export function ProfileView({ profile, pageSize }: { profile: Profile; pageSize: number }) {
  const now = useNow(profile.generatedAt);
  const headingId = useId();
  const [filter, setFilter] = useState<Filter>("all");

  // Pages loaded with "Show more", kept apart from the server-rendered first
  // page so that pressing Update can replace that page without losing these.
  const [older, setOlder] = useState<MatchSummary[]>([]);
  const [pagesLoaded, setPagesLoaded] = useState(1);
  const [hasMore, setHasMore] = useState(profile.hasMoreMatches);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const byId = new Map<string, MatchSummary>();
    for (const m of [...profile.matches, ...older]) byId.set(m.id, m);
    return [...byId.values()].sort((a, b) => b.endedAt - a.endedAt);
  }, [profile.matches, older]);

  const visible = useMemo(
    () => (filter === "all" ? matches : matches.filter((m) => queueGroup(m.queueId) === filter)),
    [matches, filter],
  );
  const summary = useMemo(() => summarize(visible), [visible]);

  async function loadMore() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/summoner/${profile.regionSlug}/${profile.requestSlug}/matches?start=${pagesLoaded * pageSize}`,
      );
      const body = (await res.json()) as Result<MatchPage>;
      if (!body.ok) {
        setLoadError(body.error.message);
        return;
      }
      setOlder((prev) => [...prev, ...body.data.matches]);
      setPagesLoaded((n) => n + 1);
      setHasMore(body.data.hasMore);
    } catch {
      setLoadError("Couldn't load more matches. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <RememberProfile
        region={profile.regionSlug}
        gameName={profile.gameName}
        tagLine={profile.tagLine}
      />
      <ProfileHeader profile={profile} />

      {/* One column on small screens, in source order: rank, matches, champion
          lists. From lg up the first and last blocks stack in a left rail. */}
      <div className="grid items-start gap-x-6 gap-y-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
        <div className="grid gap-4 sm:max-lg:grid-cols-2 lg:col-start-1 lg:row-start-1">
          {RANKED.map((queue) => (
            <RankCard
              key={queue}
              queue={queue}
              entry={profile.ranked.find((r) => r.queue === queue)}
            />
          ))}
        </div>

        <div className="min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div
            role="group"
            aria-label="Filter matches by queue"
            className="flex gap-1 overflow-x-auto rounded-xl border border-edge bg-panel p-1"
          >
            {QUEUE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.id ? "bg-lime text-ink" : "text-soft hover:bg-raised hover:text-fg"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <SummaryPanel summary={summary} />

          <section aria-labelledby={headingId}>
            <h2 id={headingId} className="sr-only">
              Match history
            </h2>
            {matches.length === 0 ? (
              <p className="card p-6 text-center text-soft">No recent matches on record.</p>
            ) : (
              <ul className="space-y-2">
                {visible.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    regionSlug={profile.regionSlug}
                    assetVersion={profile.assetVersion}
                    now={now}
                  />
                ))}
              </ul>
            )}

            {loadError && (
              <p role="alert" className="mt-3 text-sm text-loss">
                {loadError}
              </p>
            )}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="mt-3 w-full rounded-xl border border-edge bg-panel py-3 text-sm font-medium transition-colors hover:border-faint disabled:opacity-60"
              >
                {loading ? "Loading…" : "Show more matches"}
              </button>
            )}
          </section>
        </div>

        <div className="grid gap-4 sm:max-lg:grid-cols-2 lg:col-start-1 lg:row-start-2">
          <RecentChampions champions={summary.champions} assetVersion={profile.assetVersion} />
          <MasteryList mastery={profile.mastery} assetVersion={profile.assetVersion} now={now} />
        </div>
      </div>
    </div>
  );
}
