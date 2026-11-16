import type { NextRequest } from "next/server";
import { getMatchPage } from "@/lib/profile";
import type { ProfileErrorKind } from "@/lib/types";

const STATUS: Record<ProfileErrorKind, number> = {
  invalid: 400,
  not_found: 404,
  rate_limited: 429,
  auth: 502,
  upstream: 502,
};

/** Riot only serves a player's most recent matches; no point asking past that. */
const MAX_START = 900;

/** GET /api/summoner/{region}/{riotId}/matches?start=10 - one more page of match history. */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/summoner/[region]/[riotId]/matches">,
) {
  const { region, riotId } = await ctx.params;
  const raw = Number(request.nextUrl.searchParams.get("start") ?? 0);
  const start = Number.isFinite(raw) ? Math.min(MAX_START, Math.max(0, Math.floor(raw))) : 0;

  const result = await getMatchPage(region, riotId, start);
  return Response.json(result, { status: result.ok ? 200 : STATUS[result.error.kind] });
}
