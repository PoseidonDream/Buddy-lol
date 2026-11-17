import Link from "next/link";
import { formatNumber, percent } from "@/lib/format";
import { RANKED_QUEUE_NAMES, tierName } from "@/lib/game-data";
import { ladderHref } from "@/lib/ladder-url";
import { REGIONS, getRegion } from "@/lib/regions";
import { profilePath } from "@/lib/riot-id";
import type { ApexTier, LadderEntry, LadderPage, RankedQueue, Tier } from "@/lib/types";
import { TierEmblem } from "../TierEmblem";

const TIERS: ApexTier[] = ["challenger", "grandmaster", "master"];
const QUEUES: RankedQueue[] = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"];

const pill = (active: boolean) =>
  `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    active ? "bg-brand text-white" : "text-soft hover:bg-raised hover:text-fg"
  }`;

/** Region, tier and queue pickers. All plain links, so they work without JavaScript. */
export function LadderControls({
  regionSlug,
  tier,
  queue,
}: {
  regionSlug: string;
  tier: ApexTier;
  queue: RankedQueue;
}) {
  return (
    <div className="space-y-3">
      <nav
        aria-label="Region"
        className="flex gap-1 overflow-x-auto rounded-xl border border-edge bg-panel p-1"
      >
        {REGIONS.map((r) => (
          <Link
            key={r.slug}
            href={ladderHref(r.slug, { tier, queue })}
            aria-current={r.slug === regionSlug ? "page" : undefined}
            title={r.name}
            className={`${pill(r.slug === regionSlug)} font-mono text-xs`}
          >
            {r.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap gap-3">
        <nav aria-label="Tier" className="flex gap-1 rounded-xl border border-edge bg-panel p-1">
          {TIERS.map((t) => (
            <Link
              key={t}
              href={ladderHref(regionSlug, { tier: t, queue })}
              aria-current={t === tier ? "page" : undefined}
              className={pill(t === tier)}
            >
              {tierName(t.toUpperCase() as Tier)}
            </Link>
          ))}
        </nav>
        <nav aria-label="Queue" className="flex gap-1 rounded-xl border border-edge bg-panel p-1">
          {QUEUES.map((q) => (
            <Link
              key={q}
              href={ladderHref(regionSlug, { tier, queue: q })}
              aria-current={q === queue ? "page" : undefined}
              className={pill(q === queue)}
            >
              {q === "RANKED_SOLO_5x5" ? "Solo/Duo" : "Flex"}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Player({ entry, regionSlug }: { entry: LadderEntry; regionSlug: string }) {
  if (!entry.gameName || !entry.tagLine) {
    return <span className="text-faint">Name unavailable</span>;
  }
  return (
    <Link
      href={profilePath(regionSlug, { gameName: entry.gameName, tagLine: entry.tagLine })}
      prefetch={false}
      className="rounded-sm font-medium hover:underline"
    >
      {entry.gameName}
      <span className="font-normal text-faint"> #{entry.tagLine}</span>
    </Link>
  );
}

export function LadderTable({ ladder }: { ladder: LadderPage }) {
  const { entries, regionSlug, tier, queue, page, pageSize, total } = ladder;
  const region = getRegion(regionSlug);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize;

  if (total === 0) {
    return (
      <p className="card p-8 text-center text-soft">
        Nobody is in {tierName(tier.toUpperCase() as Tier)} on {region?.label} for this queue
        right now. That is normal at the start of a season.
      </p>
    );
  }

  return (
    <section aria-label="Ladder">
      <div className="card overflow-hidden">
        <div className="flex items-center gap-4 border-b border-edge p-4">
          <TierEmblem tier={tier.toUpperCase() as Tier} size={44} />
          <div>
            <h2 className="font-semibold">
              {tierName(tier.toUpperCase() as Tier)} · {RANKED_QUEUE_NAMES[queue]}
            </h2>
            <p className="font-mono text-xs text-faint">
              {formatNumber(total)} players on {region?.name}
            </p>
          </div>
        </div>

        {/* Fixed layout: the name column takes whatever the numbers leave. */}
        <table className="w-full table-fixed text-left text-sm">
          <thead>
            <tr className="label-caps">
              <th scope="col" className="w-12 py-2 pl-4 font-normal sm:w-16">#</th>
              <th scope="col" className="py-2 font-normal">Player</th>
              <th scope="col" className="w-16 py-2 pr-4 text-right font-normal sm:w-24">LP</th>
              <th scope="col" className="w-16 py-2 pr-4 font-normal max-sm:text-right sm:w-40">
                <span className="max-sm:hidden">Win rate</span>
                <span className="sm:hidden">Win</span>
              </th>
              <th scope="col" className="w-28 py-2 pr-4 text-right font-normal max-sm:hidden">Games</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge border-t border-edge">
            {entries.map((entry) => {
              const games = entry.wins + entry.losses;
              const rate = percent(entry.wins, games);
              return (
                <tr key={entry.puuid} className="hover:bg-white/[0.03]">
                  <td
                    className={`py-2.5 pl-4 font-mono tabular-nums ${
                      entry.position <= 3 ? "font-semibold text-gold" : "text-faint"
                    }`}
                  >
                    {entry.position}
                  </td>
                  <td className="truncate py-2.5 pr-3">
                    <Player entry={entry} regionSlug={regionSlug} />
                    {entry.hotStreak && (
                      <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold max-sm:hidden">
                        Hot streak
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                    {formatNumber(entry.lp)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2 max-sm:justify-end">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-loss/70 max-sm:hidden">
                        <div className="h-full bg-win" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="font-mono tabular-nums">{rate}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs tabular-nums text-faint max-sm:hidden">
                    {entry.wins}W {entry.losses}L
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-4 text-sm">
        <PageLink href={ladderHref(regionSlug, { tier, queue, page: page - 1 })} enabled={page > 1}>
          Previous
        </PageLink>
        <p className="font-mono text-xs text-faint">
          {from + 1}–{from + entries.length} of {formatNumber(total)}
        </p>
        <PageLink href={ladderHref(regionSlug, { tier, queue, page: page + 1 })} enabled={page < lastPage}>
          Next
        </PageLink>
      </nav>
    </section>
  );
}

function PageLink({
  href,
  enabled,
  children,
}: {
  href: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const style = "rounded-lg border border-edge bg-panel px-4 py-2 font-medium";
  return enabled ? (
    <Link href={href} className={`${style} transition-colors hover:border-faint`}>
      {children}
    </Link>
  ) : (
    <span className={`${style} opacity-40`} aria-disabled="true">
      {children}
    </span>
  );
}

export function LadderSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading ladder">
      <div className="h-11 animate-pulse rounded-xl bg-raised" />
      <div className="h-11 w-80 max-w-full animate-pulse rounded-xl bg-raised" />
      <div className="h-[36rem] animate-pulse rounded-xl bg-raised" />
    </div>
  );
}
