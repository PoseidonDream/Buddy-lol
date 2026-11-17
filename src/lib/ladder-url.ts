import type { ApexTier, RankedQueue } from "./types";

export interface LadderQuery {
  tier: ApexTier;
  queue: RankedQueue;
  page: number;
}

export const DEFAULT_LADDER: LadderQuery = { tier: "challenger", queue: "RANKED_SOLO_5x5", page: 1 };

const QUEUE_PARAM: Record<RankedQueue, string> = { RANKED_SOLO_5x5: "solo", RANKED_FLEX_SR: "flex" };

type Param = string | string[] | undefined;

/** Read the query string, falling back to the default for anything unrecognised. */
export function parseLadderQuery(query: { tier?: Param; queue?: Param; page?: Param }): LadderQuery {
  const tier = query.tier === "grandmaster" || query.tier === "master" ? query.tier : "challenger";
  const queue = query.queue === "flex" ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";
  const page = Number(typeof query.page === "string" ? query.page : 1);
  return { tier, queue, page: Number.isInteger(page) && page > 0 ? page : 1 };
}

/** A link to a ladder page. Defaults are left out to keep URLs short. */
export function ladderHref(regionSlug: string, query: Partial<LadderQuery> = {}): string {
  const { tier, queue, page } = { ...DEFAULT_LADDER, ...query };
  const params = new URLSearchParams();
  if (tier !== DEFAULT_LADDER.tier) params.set("tier", tier);
  if (queue !== DEFAULT_LADDER.queue) params.set("queue", QUEUE_PARAM[queue]);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return `/leaderboards/${regionSlug}${search ? `?${search}` : ""}`;
}
