import type { NextRequest } from "next/server";
import { LIMIT_MESSAGE, clientIp, takeLookups } from "@/lib/rate-limit";
import { getMatchTimeline } from "@/lib/timeline";
import type { ProfileErrorKind } from "@/lib/types";

const STATUS: Record<ProfileErrorKind, number> = {
  invalid: 400,
  not_found: 404,
  rate_limited: 429,
  auth: 502,
  upstream: 502,
};

/**
 * GET /api/match/{region}/{matchId}/timeline?player=Name-TAG
 *
 * Gold per minute, purchases, skill order and objectives for one finished
 * game. A finished game never changes, so browsers may keep the answer.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/match/[region]/[matchId]/timeline">) {
  const { region, matchId } = await ctx.params;

  const allowed = await takeLookups(clientIp(request.headers));
  if (!allowed.ok) {
    return Response.json(
      { ok: false, error: { kind: "rate_limited", message: LIMIT_MESSAGE } },
      { status: 429, headers: { "Retry-After": String(allowed.retryAfterSec) } },
    );
  }

  const result = await getMatchTimeline(region, matchId, request.nextUrl.searchParams.get("player"));
  return Response.json(result, {
    status: result.ok ? 200 : STATUS[result.error.kind],
    headers: result.ok ? { "Cache-Control": "private, max-age=86400" } : undefined,
  });
}
