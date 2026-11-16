import { useId } from "react";
import { TIER_COLORS } from "@/lib/game-data";
import type { Tier } from "@/lib/types";

/** A crest tinted with the tier's colours. `null` draws the unranked outline. */
export function TierEmblem({ tier, size = 56 }: { tier: Tier | null; size?: number }) {
  const id = useId();
  const shield =
    "M32 4 54 13.5V31c0 13-9 23.5-22 29C19 54.5 10 44 10 31V13.5Z";

  if (!tier) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <path d={shield} fill="none" stroke="#3a4150" strokeWidth="2.5" strokeDasharray="4 4" />
      </svg>
    );
  }

  const [light, dark] = TIER_COLORS[tier];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      <path d={shield} fill={`url(#${id})`} />
      <path
        d="M32 11 48 18v13c0 9.5-6.5 17.5-16 21.5C22.5 48.5 16 40.5 16 31V18Z"
        fill="#0b0d11"
        opacity="0.62"
      />
      <path d="M32 19.5 41 32l-9 12.5L23 32Z" fill={`url(#${id})`} />
      <path d="M32 19.5 41 32H23Z" fill="#fff" opacity="0.28" />
    </svg>
  );
}
