import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoBanner } from "@/components/DemoBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { LiveGameCard } from "@/components/profile/LiveGameCard";
import { ProfileProblem } from "@/components/profile/ProfileProblem";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { ProfileView } from "@/components/profile/ProfileView";
import { getLiveGame } from "@/lib/live";
import { MATCH_PAGE_SIZE, getProfile } from "@/lib/profile";
import { getRegion } from "@/lib/regions";
import { formatRiotId, riotIdFromSlug } from "@/lib/riot-id";
import type { Profile } from "@/lib/types";

type Props = PageProps<"/summoner/[region]/[riotId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region, riotId } = await params;
  const id = riotIdFromSlug(riotId);
  const server = getRegion(region);
  if (!id || !server) return { title: "Player not found" };
  return {
    title: `${formatRiotId(id)} (${server.label})`,
    description: `Rank, match history and champion stats for ${formatRiotId(id)} on ${server.name}.`,
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
  const result = await getProfile(region, riotId);

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <ProfileProblem error={result.error} />
      </main>
    );
  }

  const profile = result.data;
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
            <Suspense fallback={null}>
              <LiveGame profile={profile} />
            </Suspense>
          }
        />
      </main>
    </>
  );
}

async function LiveGame({ profile }: { profile: Profile }) {
  const game = await getLiveGame(profile);
  if (!game) return null;
  return (
    <LiveGameCard
      game={game}
      focusPuuid={profile.puuid}
      regionSlug={profile.regionSlug}
      assetVersion={profile.assetVersion}
      fetchedAt={profile.generatedAt}
    />
  );
}
