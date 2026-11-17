"use client";

import Link from "next/link";
import { DEFAULT_REGION, getRegion } from "@/lib/regions";
import { useStoredRegion } from "@/lib/storage";

const link = "rounded-md px-2.5 py-1.5 text-sm text-soft transition-colors hover:bg-raised hover:text-fg";

/** Site navigation. Region-specific pages open on the visitor's last used region. */
export function NavLinks() {
  const region = getRegion(useStoredRegion())?.slug ?? DEFAULT_REGION;
  return (
    <nav aria-label="Site" className="flex items-center gap-0.5">
      <Link href="/multisearch" className={link}>
        Multi-search
      </Link>
      <Link href={`/leaderboards/${region}`} className={link}>
        Leaderboards
      </Link>
    </nav>
  );
}
