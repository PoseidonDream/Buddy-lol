"use client";

import { useId, useMemo, useState } from "react";
import { QUEUE_FILTERS, queueGroup, type QueueGroup } from "@/lib/game-data";
import { outcomeOf, summarize } from "@/lib/stats";
import type {
  ItemNames,
  MatchPage,
  MatchSummary,
  Profile,
  RankedQueue,
  Result,
} from "@/lib/types";
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
  const [olderItemNames, setOlderItemNames] = useState<ItemNames>({});
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
  const form = useMemo(() => visible.slice(0, 20).map(outcomeOf), [visible]);
  const itemNames = useMemo(
    () => ({ ...olderItemNames, ...profile.itemNames }),
    [olderItemNames, profile.itemNames],
  );
  const counts = useMemo(() => {
    const byGroup: Partial<Record<Filter, number>> = { all: matches.length };
    for (const m of matches) {
      const group = queueGroup(m.queueId);
      byGroup[group] = (byGroup[group] ?? 0) + 1;
    }
    return byGroup;
  }, [matches]);

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
      setOlderItemNames((prev) => ({ ...prev, ...body.data.itemNames }));
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
            {QUEUE_FILTERS.map((f) => {
              const count = counts[f.id] ?? 0;
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={active}
                  // Nothing to show for an empty queue, but never trap the
                  // visitor on a filter that has just become empty.
                  disabled={count === 0 && !active}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                    active
                      ? "bg-brand text-white"
                      : "text-soft enabled:hover:bg-raised enabled:hover:text-fg"
                  }`}
                >
                  {f.label}
                  <span
                    className={`font-mono text-xs tabular-nums ${active ? "text-white/75" : "text-faint"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <SummaryPanel summary={summary} form={form} />

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
                    itemNames={itemNames}
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
