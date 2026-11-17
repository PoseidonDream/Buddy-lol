"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { profileIcon } from "@/lib/assets";
import { timeAgo } from "@/lib/format";
import { TIER_COLORS } from "@/lib/game-data";
import { getRegion } from "@/lib/regions";
import type { Profile } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { GameIcon } from "../GameIcon";

export function ProfileHeader({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const region = getRegion(profile.regionSlug);
  const now = useNow(profile.generatedAt);

  // The banner glows in the colour of the player's solo rank (flex if that is
  // all they have, the brand colour if unranked).
  const rank = profile.ranked.find((r) => r.queue === "RANKED_SOLO_5x5") ?? profile.ranked[0];
  const glow = rank ? TIER_COLORS[rank.tier][0] : "var(--color-accent)";

  return (
    <header className="card relative overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{ background: `radial-gradient(520px 260px at 0% 0%, ${glow}, transparent 70%)` }}
      />

      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-4">
        <div className="relative">
          <GameIcon
            src={profileIcon(profile.assetVersion, profile.profileIconId)}
            alt=""
            className="size-20 rounded-2xl ring-1 ring-edge sm:size-24"
          />
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-edge bg-ink px-2 py-0.5 font-mono text-xs tabular-nums">
            {profile.level}
          </span>
        </div>

        <div className="min-w-40 flex-1">
          <p className="label-caps mb-1">{region?.name ?? profile.regionSlug}</p>
          <h1 className="text-2xl font-semibold tracking-tight wrap-anywhere sm:text-3xl">
            {profile.gameName}
            <span className="font-normal text-faint"> #{profile.tagLine}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-between">
          <span className="text-xs text-faint">
            Updated {timeAgo(profile.generatedAt, now)}
          </span>
          <button
            type="button"
            onClick={() => startTransition(() => router.refresh())}
            disabled={refreshing}
            className="rounded-lg border border-edge bg-raised px-4 py-2 text-sm font-medium transition-colors hover:border-faint disabled:opacity-60"
          >
            {refreshing ? "Updating…" : "Update"}
          </button>
        </div>
      </div>
    </header>
  );
}
