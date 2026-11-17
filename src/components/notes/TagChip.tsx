import { TAG_LABELS, isPreset, tagTone } from "@/lib/note-tags";

const TONES = {
  good: "bg-win/15 text-win",
  bad: "bg-loss/15 text-loss",
  neutral: "bg-white/10 text-soft",
} as const;

/** One note tag as a small coloured label: green for good, red for bad. */
export function TagChip({ tag, className = "" }: { tag: string; className?: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-1.5 py-px text-[11px] font-medium ${TONES[tagTone(tag)]} ${className}`}
    >
      {isPreset(tag) ? TAG_LABELS[tag] : tag}
    </span>
  );
}
