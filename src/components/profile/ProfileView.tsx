"use client";

import { useId, useMemo, useState } from "react";
import {
  QUEUE_FILTERS,
  isServerFilter,
  queueGroup,
  type QueueGroup,
} from "@/lib/game-data";
import { outcomeOf, playedWith, summarize } from "@/lib/stats";
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
import { PlayedWith } from "./PlayedWith";
import { ProfileHeader } from "./ProfileHeader";
import { RankCard } from "./RankCard";
import { SummaryPanel } from "./SummaryPanel";

const RANKED: RankedQueue[] = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"];

type Filter = "all" | QueueGroup;

/**
 * Match history is paged separately for each queue filter. "all" continues
 * from the page the server rendered; a queue filter asks Riot for that queue
 * only, starting from its most recent game. ("other" has no server-side
 * equivalent, so it pages through "all" and filters here.)
 */
type Feed = "all" | Exclude<QueueGroup, "other">;

interface FeedState {
  matches: MatchSummary[];
  /** Pages fetched from the browser so far. */
  pages: number;
  /** `null` until the first page says whether there is another. */
  hasMore: boolean | null;
  loading: boolean;
  error: string | null;
}

const EMPTY: FeedState = { matches: [], pages: 0, hasMore: null, loading: false, error: null };

function feedFor(filter: Filter): Feed {
  return filter === "other" ? "all" : filter;
}

function newestFirst(matches: MatchSummary[]): MatchSummary[] {
  const byId = new Map<string, MatchSummary>();
  for (const m of matches) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => b.endedAt - a.endedAt);
}

export function ProfileView({
  profile,
  pageSize,
  liveGame,
  rankHistory,
  notes,
}: {
  profile: Profile;
  pageSize: number;
  /** Rendered under the header; streams in from the server when ready. */
  liveGame?: React.ReactNode;
  /** Rendered under the rank cards. */
  rankHistory?: React.ReactNode;
  /** Private notes, rendered right under the rank cards. */
  notes?: React.ReactNode;
}) {
  const now = useNow(profile.generatedAt);
  const headingId = useId();
  const [filter, setFilter] = useState<Filter>("all");
  const [feeds, setFeeds] = useState<Partial<Record<Feed, FeedState>>>({});
  const [moreItemNames, setMoreItemNames] = useState<ItemNames>({});

  const feed = feedFor(filter);
  const state = feeds[feed] ?? EMPTY;

  // The server-rendered first page is kept apart from pages loaded here, so
  // that pressing Update can replace it without losing the rest.
  const everything = useMemo(
    () => newestFirst([...profile.matches, ...(feeds.all?.matches ?? [])]),
    [profile.matches, feeds.all],
  );

  const visible = useMemo(() => {
    if (filter === "all") return everything;
    const inQueue = everything.filter((m) => queueGroup(m.queueId) === filter);
    if (filter === "other") return inQueue;
    // Show what is already on hand at once; the queue's own pages fill in behind it.
    return newestFirst([...inQueue, ...(feeds[filter]?.matches ?? [])]);
  }, [everything, feeds, filter]);

  const summary = useMemo(() => summarize(visible), [visible]);
  const form = useMemo(() => visible.slice(0, 20).map(outcomeOf), [visible]);
  const teammates = useMemo(() => playedWith(visible), [visible]);
  const itemNames = useMemo(
    () => ({ ...moreItemNames, ...profile.itemNames }),
    [moreItemNames, profile.itemNames],
  );

  const hasMore = state.hasMore ?? (feed === "all" ? profile.hasMoreMatches : true);

  async function loadNext(target: Feed) {
    const current = feeds[target] ?? EMPTY;
    if (current.loading) return;

    const patch = (change: Partial<FeedState>) =>
      setFeeds((prev) => ({ ...prev, [target]: { ...(prev[target] ?? EMPTY), ...change } }));
    patch({ loading: true, error: null });

    // Page one of "all" came with the profile itself.
    const start = (current.pages + (target === "all" ? 1 : 0)) * pageSize;
    const queue = isServerFilter(target) ? `&queue=${target}` : "";

    try {
      const res = await fetch(
        `/api/summoner/${profile.regionSlug}/${profile.requestSlug}/matches?start=${start}${queue}`,
      );
      const body = (await res.json()) as Result<MatchPage>;
      if (!body.ok) {
        patch({ loading: false, error: body.error.message });
        return;
      }
      setFeeds((prev) => {
        const before = prev[target] ?? EMPTY;
        return {
          ...prev,
          [target]: {
            matches: [...before.matches, ...body.data.matches],
            pages: before.pages + 1,
            hasMore: body.data.hasMore,
            loading: false,
            error: null,
          },
        };
      });
      setMoreItemNames((prev) => ({ ...prev, ...body.data.itemNames }));
    } catch {
      patch({
        loading: false,
        error: "Couldn't load more matches. Check your connection and try again.",
      });
    }
  }

  function choose(next: Filter) {
    setFilter(next);
    // First visit to a queue: fetch its most recent games straight away.
    const target = feedFor(next);
    if (target !== "all" && !feeds[target]) void loadNext(target);
  }

  return (
    <div className="space-y-6">
      <RememberProfile
        region={profile.regionSlug}
        gameName={profile.gameName}
        tagLine={profile.tagLine}
      />
      <ProfileHeader profile={profile} />
      {liveGame}

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
          {notes}
          {rankHistory}
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
                onClick={() => choose(f.id)}
                aria-pressed={filter === f.id}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.id
                    ? "bg-brand text-white"
                    : "text-soft hover:bg-raised hover:text-fg"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <SummaryPanel summary={summary} form={form} loading={state.loading} />

          <section aria-labelledby={headingId} aria-busy={state.loading}>
            <h2 id={headingId} className="sr-only">
              Match history
            </h2>
            {visible.length > 0 ? (
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
            ) : (
              !state.loading &&
              filter === "all" && (
                <p className="card p-6 text-center text-soft">No recent matches on record.</p>
              )
            )}

            {state.error && (
              <p role="alert" className="mt-3 text-sm text-loss">
                {state.error}
              </p>
            )}
            {(hasMore || state.loading) && (
              <button
                type="button"
                onClick={() => loadNext(feed)}
                disabled={state.loading}
                className="mt-3 w-full rounded-xl border border-edge bg-panel py-3 text-sm font-medium transition-colors hover:border-faint disabled:opacity-60"
              >
                {state.loading ? "Loading…" : "Show more matches"}
              </button>
            )}
          </section>
        </div>

        <div className="grid gap-4 sm:max-lg:grid-cols-2 lg:col-start-1 lg:row-start-2">
          <RecentChampions champions={summary.champions} assetVersion={profile.assetVersion} />
          <PlayedWith
            teammates={teammates}
            games={visible.filter((m) => !m.remake).length}
            regionSlug={profile.regionSlug}
            assetVersion={profile.assetVersion}
          />
          <MasteryList mastery={profile.mastery} assetVersion={profile.assetVersion} now={now} />
        </div>
      </div>
    </div>
  );
}
