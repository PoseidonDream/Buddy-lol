import type { NextRequest } from "next/server";
import { collect } from "@/lib/collector";
import { getRegion } from "@/lib/regions";
import { riotApiKey } from "@/lib/riot/client";
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
  for (const region of regions) reports.push(await collect(region, { budget }));
  return Response.json({ ok: true, store: getStore().kind, reports });
}
