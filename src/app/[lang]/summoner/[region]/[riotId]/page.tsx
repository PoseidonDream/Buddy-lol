import type { Metadata } from "next";
import { headers } from "next/headers";
import { after, connection } from "next/server";
import { Suspense } from "react";
import { DemoBanner } from "@/components/DemoBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { LiveGameCard } from "@/components/profile/LiveGameCard";
import { RankHistoryChart } from "@/components/profile/RankHistoryChart";
import { ProfileProblem } from "@/components/profile/ProfileProblem";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { ProfileView } from "@/components/profile/ProfileView";
import { getDict, getLocale } from "@/i18n/server";
import { getLiveGame } from "@/lib/live";
import { currentWriter } from "@/lib/notes-auth";
import { getStore } from "@/lib/store";
import type { NoteSummary } from "@/lib/store/types";
import { MATCH_PAGE_SIZE, getProfile } from "@/lib/profile";
import { getRankHistory } from "@/lib/rank-history";
import { clientIp, takeLookups } from "@/lib/rate-limit";
import { recordProfile } from "@/lib/record";
import { getRegion } from "@/lib/regions";
import { formatRiotId, riotIdFromSlug } from "@/lib/riot-id";
import type { Profile } from "@/lib/types";

type Props = PageProps<"/[lang]/summoner/[region]/[riotId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region, riotId } = await params;
  const id = riotIdFromSlug(riotId);
  const server = getRegion(region);
  const t = await getDict();
  if (!id || !server) return { title: t.errors.titles.not_found };
  return {
    title: `${formatRiotId(id)} (${server.label})`,
    description: t.profile.metaDescription(formatRiotId(id), t.game.regionName(server.slug)),
  };
}

export default function SummonerPage({ params }: Props) {
  return (
    <>
      <SiteHeader showSearch />
      {/* The header and skeleton are static; the profile streams in behind them. */}
      <Suspense
        fallback={
          <main className="mx-auto max-w-6xl px-4 py-8">
            <ProfileSkeleton />
          </main>
        }
      >
        <ProfileSection params={params} />
      </Suspense>
    </>
  );
}

async function ProfileSection({ params }: Pick<Props, "params">) {
  const { region, riotId } = await params;
  // A profile is a live snapshot: always build it for the request at hand.
  // Riot API responses are cached individually, one level down.
  await connection();

  const allowed = await takeLookups(clientIp(await headers()));
  if (!allowed.ok) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <ProfileProblem error={{ kind: "rate_limited" as const, message: (await getDict()).errors.limit }} />
      </main>
    );
  }

  const locale = await getLocale();
  const result = await getProfile(region, riotId, undefined, locale);

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <ProfileProblem error={result.error} />
      </main>
    );
  }

  const profile = result.data;
  // Save today's rank and any ranked games once the page has been sent.
  after(() => recordProfile(profile));

  return (
    <>
      {profile.source === "demo" && <DemoBanner />}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Keyed so that state (filters, loaded pages) resets between players. */}
        <ProfileView
          key={profile.puuid}
          profile={profile}
          pageSize={MATCH_PAGE_SIZE}
          liveGame={
            // Checked separately so a slow answer never holds up the profile.
            <Suspense key="LiveGame" fallback={null}>
              <LiveGame profile={profile} />
            </Suspense>
          }
          rankHistory={
            <Suspense key="RankHistorySection" fallback={null}>
              <RankHistorySection profile={profile} />
            </Suspense>
          }
          notes={
            <Suspense key="NotesPanel" fallback={null}>
              <NotesPanel profile={profile} />
            </Suspense>
          }
        />
      </main>
    </>
  );
}

async function RankHistorySection({ profile }: { profile: Profile }) {
  const history = await getRankHistory(profile, await getLocale());
  return history ? <RankHistoryChart history={history} /> : null;
}

async function LiveGame({ profile }: { profile: Profile }) {
  const game = await getLiveGame(profile, await getLocale());
  if (!game) return null;

  // People who have unlocked notes see which players they've noted before.
  let notes: Record<string, NoteSummary> = {};
  if (await currentWriter()) {
    const puuids = game.teams.flatMap((t) => t.players.flatMap((p) => (p.puuid ? [p.puuid] : [])));
    notes = await getStore()
      .noteSummaries(puuids)
      .catch(() => ({}));
  }

  return (
    <LiveGameCard
      game={game}
      focusPuuid={profile.puuid}
      regionSlug={profile.regionSlug}
      assetVersion={profile.assetVersion}
      fetchedAt={profile.generatedAt}
      notes={notes}
    />
  );
}
