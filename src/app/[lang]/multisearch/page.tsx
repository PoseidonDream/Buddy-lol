import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoBanner } from "@/components/DemoBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { MultiSearchForm } from "@/components/multi/MultiSearchForm";
import { PlayerCard, PlayerCardProblem, PlayerCardSkeleton } from "@/components/multi/PlayerCard";
import { parseLobby } from "@/lib/lobby";
import { getProfile, isDemoMode } from "@/lib/profile";
import { getDict, getLocale } from "@/i18n/server";
import { clientIp, takeLookups } from "@/lib/rate-limit";
import { DEFAULT_REGION, getRegion } from "@/lib/regions";
import { riotIdToSlug, type RiotId } from "@/lib/riot-id";

/**
 * Each card shows this many recent games. Kept small because a lobby of five
 * costs five times as many Riot requests as one profile.
 */
const CARD_MATCHES = 5;

type Props = PageProps<"/[lang]/multisearch">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return { title: t.multi.title, description: t.multi.metaDescription };
}

export default function MultiSearchPage({ searchParams }: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  await connection();

  const regionParam = typeof query.region === "string" ? query.region : null;
  const region = getRegion(regionParam) ?? getRegion(DEFAULT_REGION)!;
  const text = typeof query.q === "string" ? query.q : "";
  const { players } = parseLobby(text, region.defaultTag);
  const demo = isDemoMode();
  const t = await getDict();

  return (
    <>
      {demo && <DemoBanner />}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">{t.multi.title}</h1>
        <p className="mt-2 max-w-2xl text-soft">{t.multi.intro}</p>

        <div className="mt-6 max-w-2xl">
          <MultiSearchForm
            // Remount when the URL changes, so the form shows what was searched.
            key={`${regionParam}|${text}`}
            initialRegion={getRegion(regionParam) ? regionParam : null}
            initialText={players.map((p) => `${p.gameName}#${p.tagLine}`).join("\n")}
            showSample={demo}
          />
        </div>

        {players.length > 0 && (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {players.map((id) => (
              <Suspense key={`${id.gameName}#${id.tagLine}`} fallback={<PlayerCardSkeleton />}>
                <Card regionSlug={region.slug} id={id} />
              </Suspense>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

async function Card({ regionSlug, id }: { regionSlug: string; id: RiotId }) {
  const allowed = await takeLookups(clientIp(await headers()));
  if (!allowed.ok) {
    const message = (await getDict()).errors.limit;
    return <PlayerCardProblem id={id} error={{ kind: "rate_limited" as const, message }} />;
  }
  const result = await getProfile(
    regionSlug,
    riotIdToSlug(id),
    { matches: CARD_MATCHES, mastery: 0 },
    await getLocale(),
  );
  return result.ok ? <PlayerCard profile={result.data} /> : <PlayerCardProblem id={id} error={result.error} />;
}
