"use server";

import { refresh } from "next/cache";
import { currentWriter } from "@/lib/notes-auth";
import { MAX_PINNED } from "@/lib/pinned";
import { getRegion } from "@/lib/regions";
import { getStore } from "@/lib/store";

/** Pins a player to the home page, or unpins them. Only for people who unlocked notes. */
export async function togglePin(form: FormData): Promise<void> {
  const writer = await currentWriter();
  if (!writer) return;

  const store = getStore();
  const puuid = String(form.get("puuid") ?? "");
  if (!puuid || puuid.length > 100) return;

  if (form.get("pinned") === "1") {
    await store.unpinPlayer(puuid);
  } else {
    const region = getRegion(String(form.get("region") ?? ""));
    const riotId = String(form.get("riotId") ?? "").slice(0, 40);
    if (!region || !riotId.includes("#")) return;
    const pins = await store.listPinned();
    if (pins.length >= MAX_PINNED && !pins.some((p) => p.puuid === puuid)) return;
    await store.pinPlayer({ puuid, regionSlug: region.slug, riotId, pinnedBy: writer, at: Date.now() });
  }
  refresh();
}
