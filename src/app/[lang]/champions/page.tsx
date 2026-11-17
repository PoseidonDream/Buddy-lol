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
import { getDict, getLocale } from "@/i18n/server";
import { formatNumber } from "@/lib/format";
import { POSITIONS } from "@/lib/game-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return { title: t.tierList.title, description: t.tierList.metaDescription };
}

type Props = PageProps<"/[lang]/champions">;

export default async function ChampionsPage({ searchParams }: Props) {
  const t = await getDict();
  return (
    <>
      <SiteHeader showSearch />
      <Suspense
        fallback={
          <main className="mx-auto max-w-5xl px-4 py-8">
            <h1 className="text-3xl font-semibold tracking-tight">{t.tierList.title}</h1>
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

  const locale = await getLocale();
  const t = await getDict();
  const [table, staticData] = await Promise.all([getChampionTable(patchParam, locale), getStaticData(locale)]);
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
            <h1 className="text-3xl font-semibold tracking-tight">{t.tierList.title}</h1>
            <p className="mt-2 text-sm text-soft">
              {table.patch ? t.tierList.subtitle(table.patch, formatNumber(table.matches)) : t.tierList.soloOnly}
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
            <nav aria-label={t.tierList.role} className="mt-6 mb-4 flex gap-1 overflow-x-auto rounded-xl border border-edge bg-panel p-1">
              <Link href={href()} className={pill(!position)} aria-current={!position ? "page" : undefined}>
                {t.tierList.allRoles}
              </Link>
              {POSITIONS.map((p) => (
                <Link
                  key={p}
                  href={href(POSITION_SLUGS[p])}
                  className={pill(position === p)}
                  aria-current={position === p ? "page" : undefined}
                >
                  {t.game.position(p)}
                </Link>
              ))}
            </nav>
            <TierTable rows={rows} assetVersion={staticData.version} patch={table.patch} />
            <p className="mt-4 text-xs leading-relaxed text-faint">
              {t.tierList.explain(table.minGames)}
            </p>
          </>
        ) : (
          <div className="card mt-6 p-8 text-center">
            <h2 className="font-semibold">{t.tierList.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-soft">{t.tierList.emptyBody}</p>
          </div>
        )}
      </main>
    </>
  );
}
