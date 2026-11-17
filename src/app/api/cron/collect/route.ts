import type { NextRequest } from "next/server";
import { collect } from "@/lib/collector";
import { getRegion } from "@/lib/regions";
import { RiotApiError, riotApiKey } from "@/lib/riot/client";
import { getStore } from "@/lib/store";

export const maxDuration = 60;

/**
 * GET /api/cron/collect?region=euw&budget=80
 *
 * Runs the collector for each region given (or COLLECT_REGIONS, or euw).
 * Needs `Authorization: Bearer <CRON_SECRET>`; Vercel Cron sends it
 * automatically. Without CRON_SECRET it only runs in development.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : process.env.NODE_ENV === "development";
  if (!authorized) {
    return Response.json(
      { ok: false, error: secret ? "Wrong or missing secret." : "Set CRON_SECRET to run this outside development." },
      { status: 401 },
    );
  }
  if (riotApiKey() === null) {
    return Response.json({ ok: false, error: "Collecting needs a Riot API key." }, { status: 400 });
  }

  const params = request.nextUrl.searchParams;
  const regions = (params.get("region") ?? process.env.COLLECT_REGIONS ?? "euw")
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter((r) => getRegion(r));
  if (regions.length === 0) {
    return Response.json({ ok: false, error: "No known region given." }, { status: 400 });
  }
  const raw = Number(params.get("budget") ?? 80);
  // Shared between regions: they run on the same key.
  const budget = Math.floor(Math.min(500, Math.max(1, Number.isFinite(raw) ? raw : 80)) / regions.length);

  const reports = [];
  try {
    for (const region of regions) reports.push(await collect(region, { budget }));
  } catch (err) {
    const keyRejected = err instanceof RiotApiError && (err.status === 401 || err.status === 403);
    console.error("Collector failed.", err);
    return Response.json(
      {
        ok: false,
        error: keyRejected
          ? "Riot rejected the API key. Development keys expire after 24 hours."
          : "The collector stopped on an unexpected error; see the server log.",
        reports,
      },
      { status: keyRejected ? 502 : 500 },
    );
  }
  return Response.json({ ok: true, store: getStore().kind, reports });
}
