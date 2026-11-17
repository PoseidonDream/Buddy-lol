"use client";

import { useDict } from "@/i18n/client";
import { isPreset, tagTone } from "@/lib/note-tags";

const TONES = {
  good: "bg-win/15 text-win",
  bad: "bg-loss/15 text-loss",
  neutral: "bg-white/10 text-soft",
} as const;

/** One note tag as a small coloured label: green for good, red for bad. */
export function TagChip({ tag, className = "" }: { tag: string; className?: string }) {
  const t = useDict();
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-1.5 py-px text-[11px] font-medium ${TONES[tagTone(tag)]} ${className}`}
    >
      {isPreset(tag) ? t.tags[tag] : tag}
    </span>
  );
}
