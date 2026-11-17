"use client";

import Link from "next/link";
import { useDict } from "@/i18n/client";
import { DEFAULT_REGION, getRegion } from "@/lib/regions";
import { useStoredRegion } from "@/lib/storage";

const link = "rounded-md px-2.5 py-1.5 text-sm text-soft transition-colors hover:bg-raised hover:text-fg";

/** Site navigation. Region-specific pages open on the visitor's last used region. */
export function NavLinks() {
  const t = useDict();
  const region = getRegion(useStoredRegion())?.slug ?? DEFAULT_REGION;
  return (
    <nav aria-label={t.nav.label} className="flex items-center gap-0.5">
      <Link href="/champions" className={link}>
        {t.nav.champions}
      </Link>
      <Link href="/multisearch" className={link}>
        {t.nav.multisearch}
      </Link>
      <Link href={`/leaderboards/${region}`} className={link}>
        {t.nav.leaderboards}
      </Link>
    </nav>
  );
}
