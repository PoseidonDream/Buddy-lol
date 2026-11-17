import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoBanner } from "@/components/DemoBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { LadderControls, LadderSkeleton, LadderTable } from "@/components/ladder/LadderView";
import { ProfileProblem } from "@/components/profile/ProfileProblem";
import { getLadder } from "@/lib/ladder";
import { parseLadderQuery } from "@/lib/ladder-url";
import { LIMIT_MESSAGE, clientIp, takeLookups } from "@/lib/rate-limit";
import { getRegion } from "@/lib/regions";

type Props = PageProps<"/leaderboards/[region]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region } = await params;
  const server = getRegion(region);
  return {
    title: server ? `${server.label} leaderboard` : "Leaderboard",
    description: server
      ? `The best ranked League of Legends players on ${server.name}.`
      : undefined,
  };
}

export default function LeaderboardPage({ params, searchParams }: Props) {
  return (
    <>
      <SiteHeader showSearch />
      <Suspense
        fallback={
          <main className="mx-auto max-w-4xl px-4 py-8">
            <h1 className="mb-6 text-3xl font-semibold tracking-tight">Leaderboard</h1>
            <LadderSkeleton />
          </main>
        }
      >
        <Ladder params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Ladder({ params, searchParams }: Props) {
  const { region } = await params;
  const query = parseLadderQuery(await searchParams);
  // Standings move all day; build the page for each request.
  await connection();

  const allowed = await takeLookups(clientIp(await headers()));
  if (!allowed.ok) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <ProfileProblem error={{ kind: "rate_limited" as const, message: LIMIT_MESSAGE }} />
      </main>
    );
  }

  const result = await getLadder(region, query.tier, query.queue, query.page);

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <ProfileProblem error={result.error} />
      </main>
    );
  }

  const ladder = result.data;
  return (
    <>
      {ladder.source === "demo" && <DemoBanner />}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">Leaderboard</h1>
        <div className="space-y-4">
          <LadderControls regionSlug={ladder.regionSlug} tier={ladder.tier} queue={ladder.queue} />
          <LadderTable ladder={ladder} />
        </div>
      </main>
    </>
  );
}
