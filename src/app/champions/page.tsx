import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoBanner } from "@/components/DemoBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { PatchSelect } from "@/components/champions/PatchSelect";
import { TierTable } from "@/components/champions/TierTable";
import { POSITION_SLUGS, getChampionTable, positionFromSlug } from "@/lib/champions";
import { getStaticData } from "@/lib/ddragon";
import { POSITIONS, POSITION_NAMES } from "@/lib/game-data";

export const metadata: Metadata = {
  title: "Champion tier list",
  description: "Win, pick and ban rates for every champion in ranked solo queue, by role and patch.",
};

type Props = PageProps<"/champions">;

export default function ChampionsPage({ searchParams }: Props) {
  return (
    <>
      <SiteHeader showSearch />
      <Suspense
        fallback={
          <main className="mx-auto max-w-5xl px-4 py-8">
            <h1 className="text-3xl font-semibold tracking-tight">Champion tier list</h1>
            <div className="mt-6 h-[36rem] animate-pulse rounded-xl bg-raised" />
          </main>
        }
      >
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const pill = (active: boolean) =>
  `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    active ? "bg-brand text-white" : "text-soft hover:bg-raised hover:text-fg"
  }`;

async function Content({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  await connection();
  const patchParam = typeof query.patch === "string" ? query.patch : undefined;
  const position = positionFromSlug(query.position);

  const [table, staticData] = await Promise.all([getChampionTable(patchParam), getStaticData()]);
  const rows = table.rows
    .filter((r) => !position || r.position === position)
    .map((r) => ({ ...r, positionSlug: POSITION_SLUGS[r.position] }));

  const href = (slug?: string) => {
    const params = new URLSearchParams();
    if (slug) params.set("position", slug);
    if (table.patch && table.patch !== table.patches[0]) params.set("patch", table.patch);
    const s = params.toString();
    return `/champions${s ? `?${s}` : ""}`;
  };

  return (
    <>
      {table.source === "demo" && <DemoBanner />}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Champion tier list</h1>
            <p className="mt-2 text-sm text-soft">
              {table.patch
                ? `Ranked solo queue on patch ${table.patch}, from ${table.matches.toLocaleString("en-US")} games.`
                : "Ranked solo queue."}
            </p>
          </div>
          {table.patch && table.patches.length > 1 && (
            <PatchSelect
              patches={table.patches}
              current={table.patch}
              basePath="/champions"
              keep={position ? { position: POSITION_SLUGS[position] } : undefined}
            />
          )}
        </div>

        {table.patch ? (
          <>
            <nav aria-label="Role" className="mt-6 mb-4 flex gap-1 overflow-x-auto rounded-xl border border-edge bg-panel p-1">
              <Link href={href()} className={pill(!position)} aria-current={!position ? "page" : undefined}>
                All roles
              </Link>
              {POSITIONS.map((p) => (
                <Link
                  key={p}
                  href={href(POSITION_SLUGS[p])}
                  className={pill(position === p)}
                  aria-current={position === p ? "page" : undefined}
                >
                  {POSITION_NAMES[p]}
                </Link>
              ))}
            </nav>
            <TierTable rows={rows} assetVersion={staticData.version} patch={table.patch} />
            <p className="mt-4 text-xs leading-relaxed text-faint">
              Tiers rank win rate after pulling it toward 50% by a hundred games, so a champion
              needs both a good record and enough games to rank highly. Champions with fewer than{" "}
              {table.minGames} games in a role show no tier. Pick and ban rates are shares of all
              games on the patch.
            </p>
          </>
        ) : (
          <div className="card mt-6 p-8 text-center">
            <h2 className="font-semibold">No games counted yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-soft">
              The tier list is built from ranked solo games this site has seen: every profile
              opened adds its games, and the collector job gathers games from the top of the
              ladder. Run it once and this page fills in. The README explains how.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
